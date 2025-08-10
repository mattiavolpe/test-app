# Tokyo Live 3D — Modern v3.8

## Novità
- Supporto **YouTube full embed URL**: se il backend fornisce `fullUrl` (es. Skyline), il player usa esattamente quell'URL.
- Debug toggle per vedere il percorso di risoluzione stream.

## Deploy
- Vercel: build `npm run build`, output `dist`
- Env: `VITE_PROXY_BASE = https://<tuo>.up.railway.app`
