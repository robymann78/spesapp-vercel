export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { image, mediaType } = req.body;
  if (!image) return res.status(400).json({ error: "Missing image" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType || "image/jpeg", data: image }
            },
            {
              type: "text",
              text: `Analizza questo scontrino/ricevuta italiana ed estrai i dati.
Rispondi SOLO con JSON valido, nessun testo extra:
{
  "importo": <numero decimale totale pagato, senza simbolo €>,
  "data": "<YYYY-MM-DD, o null se non leggibile>",
  "descrizione": "<nome esercizio o tipo spesa, max 60 caratteri>",
  "categoria": "<una tra: travel, meals, hotel, fuel, client, materials, other>"
}

Regole per la categoria:
- travel: treni, aerei, taxi, autobus, traghetti, noleggio auto, pedaggi, parcheggi
- meals: ristoranti, bar, caffè, pizzerie, trattorie, qualsiasi consumazione cibo/bevande
- hotel: hotel, alberghi, B&B, affittacamere, Airbnb
- fuel: benzina, gasolio, GPL, stazioni di servizio (Eni, Q8, IP, Agip, Shell, ecc.)
- client: cene/pranzi di rappresentanza con clienti, omaggi, intrattenimento clienti
- materials: cancelleria, materiale ufficio, hardware, forniture aziendali
- other: tutto ciò che non rientra nelle categorie precedenti

Se non riesci a leggere un campo numerico metti null. importo DEVE essere un numero.`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: "Anthropic API error", detail: err });
    }

    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch (e) {
    return res.status(500).json({ error: "OCR failed", detail: e.message });
  }
}
