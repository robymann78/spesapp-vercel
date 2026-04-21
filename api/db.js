const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  try {
    const body = req.body || {};
    const { action, expense, id, fields } = body;

    switch (action) {

      case "list": {
        const rows = await supabase("GET", "expenses?select=*&order=date.desc,created_at.desc");
        return res.status(200).json(rows || []);
      }

      case "insert": {
        const exp = expense;
        const payload = {
          id: exp.id,
          user_id: exp.user_id,
          user_name: exp.user_name,
          date: exp.date,
          amount: exp.amount,
          currency: exp.currency || "EUR",
          category: exp.category,
          description: exp.description,
          shared_with: exp.shared_with || null,
          tip: exp.tip || 0,
          payment_method: exp.payment_method || "carta",
          visit_reason: exp.visit_reason || null,
          place: exp.place || null,
          status: exp.status || "pending",
          note: exp.note || "",
          receipt: exp.receipt || false,
          receipt_url: exp.receipt_url || null,
        };
        const rows = await supabase("POST", "expenses", payload);
        return res.status(200).json((rows && rows[0]) || payload);
      }

      case "update": {
        if (!id) return res.status(400).json({ error: "Missing id" });
        const rows = await supabase("PATCH", `expenses?id=eq.${id}`, fields);
        return res.status(200).json((rows && rows[0]) || { ok: true });
      }

      case "delete": {
        if (!id) return res.status(400).json({ error: "Missing id" });
        await supabase("DELETE", `expenses?id=eq.${id}`);
        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
