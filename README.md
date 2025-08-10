# Tokyo Live 3D — Modern v3.6

## Novità
- Marker molto più visibili (sfera grande + beacon rosso).
- Navigazione: drag orizzontale invertito; WASD corretto.
- Click sui marker → **player diretto** quando possibile:
  1) `hlsUrl` diretto
  2) `ytId` diretto
  3) `getyoutube` (estrazione ID YouTube da pagina)
  4) `gethls` (estrazione .m3u8 da pagina)
  5) fallback: iframe proxato o diretto

## Config Vercel
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_PROXY_BASE = https://<il-tuo>.up.railway.app`

## Marker
Modifica `public/markers.json` per aggiungere/rimuovere punti (niente rebuild necessario).
