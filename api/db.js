const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": method === "POST" ? "return=representation" : "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function toDb(exp) {
  return {
    user_id: exp.userId,
    user_name: exp.userName,
    date: exp.date,
    amount: exp.amount,
    currency: exp.currency || "EUR",
    category: exp.category,
    description: exp.description,
    shared_with: exp.sharedWith || null,
    status: exp.status || "pending",
    note: exp.note || "",
    receipt: exp.receipt || false,
  };
}

function fromDb(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    date: row.date,
    amount: parseFloat(row.amount),
    currency: row.currency || "EUR",
    category: row.category,
    description: row.description,
    sharedWith: row.shared_with || "",
    status: row.status,
    note: row.note || "",
    receipt: row.receipt || false,
    receiptUrl: row.receipt_url || null,
    receiptPreview: null,
    receiptFull: null,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  try {
    const { action, expense, id, status, note } = req.body || {};

    // GET all expenses
    if (req.method === "GET") {
      const rows = await supabase("GET", "expenses?select=*&order=date.desc,created_at.desc");
      return res.status(200).json(rows.map(fromDb));
    }

    switch (action) {
      case "add": {
        const rows = await supabase("POST", "expenses", toDb(expense));
        return res.status(200).json(fromDb(rows[0]));
      }
      case "edit": {
        const rows = await supabase("PATCH", `expenses?id=eq.${expense.id}`, toDb(expense));
        return res.status(200).json(fromDb(rows[0]));
      }
      case "updateStatus": {
        const rows = await supabase("PATCH", `expenses?id=eq.${id}`, { status, note });
        return res.status(200).json(fromDb(rows[0]));
      }
      case "updateReceiptUrl": {
        const { url } = req.body;
        const rows = await supabase("PATCH", `expenses?id=eq.${id}`, { receipt_url: url, receipt: true });
        return res.status(200).json(fromDb(rows[0]));
      }
      case "delete": {
        await supabase("DELETE", `expenses?id=eq.${id}`);
        return res.status(200).json({ ok: true });
      }
      default:
        return res.status(400).json({ error: "Unknown action" });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
