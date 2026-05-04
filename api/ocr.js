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
              text: `Analizza questo scontrino/ricevuta ed estrai i dati.
Rispondi SOLO con JSON valido, nessun testo extra:
{
  "importo": <numero decimale totale pagato, senza simbolo valuta>,
  "data": "<YYYY-MM-DD in formato ISO, o null se non leggibile>",
  "descrizione": "<nome esercizio o tipo spesa, max 60 caratteri>",
  "categoria": "<una tra: meals, hotel, taxi, carrental, parking, toll, fuel, travel, other>"
}

REGOLA CRITICA PER LA DATA: converti SEMPRE in formato ISO YYYY-MM-DD.
- Se vedi "15/04/2026" → "2026-04-15" (formato europeo gg/mm/aaaa)
- Se vedi "04/15/2026" → "2026-04-15" (formato americano mm/gg/aaaa)
- Se vedi "2026-04-15" → "2026-04-15" (già ISO)
- Se il giorno è > 12, è sicuramente il giorno (non il mese)
- In caso di dubbio su uno scontrino europeo usa sempre gg/mm/aaaa
- Il mese non può MAI essere > 12

Regole per la categoria:
- meals: ristoranti, bar, caffè, pizzerie, trattorie, qualsiasi cibo/bevande
- hotel: hotel, alberghi, B&B, affittacamere, Airbnb
- taxi: taxi, NCC, Uber, trasporto privato
- carrental: noleggio auto, rent a car
- parking: parcheggi, autorimesse, ZTL
- toll: pedaggi autostradali, caselli
- fuel: benzina, gasolio, GPL, stazioni di servizio
- travel: treni, aerei, autobus, traghetti, qualsiasi viaggio
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

    // Sanity check sulla data: se mese > 12, probabilmente è invertita
    if (parsed.data && /^\d{4}-\d{2}-\d{2}$/.test(parsed.data)) {
      const [y, m, d] = parsed.data.split("-").map(Number);
      if (m > 12 && d <= 12) {
        // Inverti mese e giorno
        parsed.data = `${y}-${String(d).padStart(2,"0")}-${String(m).padStart(2,"0")}`;
      }
    }

    return res.status(200).json(parsed);

  } catch (e) {
    return res.status(500).json({ error: "OCR failed", detail: e.message });
  }
}
