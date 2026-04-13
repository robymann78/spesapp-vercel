# SpesApp — PWA Note Spese
### MyCrypto S.r.l.

---

## Struttura del pacchetto

```
spesapp-vercel/
  index.html      ← App completa
  manifest.json   ← Configurazione PWA
  sw.js           ← Service Worker (offline)
  vercel.json     ← Configurazione Vercel
  icon-192.png    ← Icona app
  icon-512.png    ← Icona app
```

> ⚠️ I file sono già nella **root** dello zip — non dentro una sottocartella.
> Questo è il formato corretto per Vercel.

---

## Deploy su Vercel (drag & drop)

1. Estrai lo zip → ottieni la cartella `spesapp-vercel`
2. Vai su **[vercel.com](https://vercel.com)** e accedi
3. Clicca **"Add New → Project"**
4. Scegli **"Browse"** o trascina la cartella `spesapp-vercel`
5. **NON modificare nulla** — lascia tutto come proposto da Vercel
6. Clicca **Deploy**

In alternativa usa **Netlify Drop** (ancora più semplice):
1. Vai su **[app.netlify.com/drop](https://app.netlify.com/drop)**
2. Trascina la cartella `spesapp-vercel` nella pagina
3. Pronto — nessun account richiesto

---

## Installazione sul telefono

**Android (Chrome):** apri l'URL → tocca il banner "Installa SpesApp"

**iPhone (Safari):** apri l'URL → Condividi → Aggiungi a schermata Home
