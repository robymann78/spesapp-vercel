const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  try {
    // DELETE receipt
    if (req.method === "DELETE") {
      const { path } = req.body;
      if (!path) return res.status(400).json({ error: "Missing path" });

      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/receipts/${path}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
      });
      return res.status(200).json({ ok: r.ok });
    }

    // POST - upload image
    if (req.method === "POST") {
      const { image, mediaType, expenseId } = req.body;
      if (!image || !expenseId) return res.status(400).json({ error: "Missing image or expenseId" });

      // Convert base64 to binary
      const binary = Buffer.from(image, "base64");
      const ext = mediaType?.includes("png") ? "png" : "jpg";
      const path = `${expenseId}.${ext}`;

      // Upload to Supabase Storage
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/receipts/${path}`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": mediaType || "image/jpeg",
          "x-upsert": "true",
        },
        body: binary,
      });

      if (!r.ok) {
        const err = await r.text();
        return res.status(502).json({ error: "Upload failed", detail: err });
      }

      // Return public URL
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/receipts/${path}`;
      return res.status(200).json({ url: publicUrl, path });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
