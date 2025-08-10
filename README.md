# Tokyo Live 3D — Modern v3.7

## Novità
- Marker XL con beacon rosso.
- WASD corretto + drag orizzontale invertito.
- Player diretto quando possibile: HLS → YouTube → HLS/YouTube da pagina → iframe.
- **Debug toggle** nell'overlay: mostra i passaggi (getyoutube/gethls/fallback).

## Deploy
- Vercel: build `npm run build`, output `dist`
- Env: `VITE_PROXY_BASE = https://<tuo>.up.railway.app`
- Modifica i marker in `public/markers.json` senza rebuild.

