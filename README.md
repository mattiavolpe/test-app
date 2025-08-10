# Tokyo Live 3D — Modern v4.0

## Cosa c'è di nuovo
- **Bugfix**: eliminato `ReferenceError: L is not defined`.
- **YouTube embed**: per `ytId` ora uso `www.youtube.com/embed` (non `nocookie`) per ridurre casi di restrizione.
- **Priorità sorgenti**: `youtubeFullUrl` → `ytId` → HLS → discovery (getyoutube/gethls) → iframe.

## Deploy (Vercel)
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_PROXY_BASE = https://<tuo>.up.railway.app`
- Modifica `public/markers.json` senza rebuild.

