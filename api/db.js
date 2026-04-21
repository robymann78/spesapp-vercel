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
          user_id: exp.user_id,
          user_name: exp.user_name,
          date: exp.date,
          amount: exp.amount,
          currency: exp.currency || "EUR",
          category: exp.category,
          description: exp.description,
          shared_with: exp.shared_with || null,
          status: exp.status || "pending",
          note: exp.note || "",
          receipt: exp.receipt || false,
          receipt_url: exp.receipt_url || null,
        };
        // Add extended fields only if they have values
        if (exp.tip != null && exp.tip !== 0) payload.tip = exp.tip;
        if (exp.payment_method && exp.payment_method !== "carta") payload.payment_method = exp.payment_method;
        if (exp.visit_reason) payload.visit_reason = exp.visit_reason;
        if (exp.place) payload.place = exp.place;

        try {
          const rows = await supabase("POST", "expenses", payload);
          return res.status(200).json((rows && rows[0]) || payload);
        } catch(e) {
          // Retry without extended fields if column error
          if (e.message.includes("column") || e.message.includes("42703")) {
            delete payload.tip; delete payload.payment_method;
            delete payload.visit_reason; delete payload.place;
            const rows2 = await supabase("POST", "expenses", payload);
            return res.status(200).json((rows2 && rows2[0]) || payload);
          }
          throw e;
        }
      }

      case "update": {
        if (!id) return res.status(400).json({ error: "Missing id" });
        try {
          const rows = await supabase("PATCH", `expenses?id=eq.${id}`, fields);
          return res.status(200).json((rows && rows[0]) || { ok: true });
        } catch(e) {
          // Retry without extended fields if column error
          if (e.message.includes("column") || e.message.includes("42703")) {
            const safeFields = { ...fields };
            delete safeFields.tip; delete safeFields.payment_method;
            delete safeFields.visit_reason; delete safeFields.place;
            const rows2 = await supabase("PATCH", `expenses?id=eq.${id}`, safeFields);
            return res.status(200).json((rows2 && rows2[0]) || { ok: true });
          }
          throw e;
        }
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
