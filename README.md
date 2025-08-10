# Tokyo Live 3D — Hybrid (Fixed)

Pronto per **Vercel** (frontend) e opzionalmente **Railway/Render** (proxy).

## Deploy rapido
1) Crea una repo GitHub con questi file.
2) In Vercel imposta:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variable: `VITE_PROXY_BASE` = URL del tuo proxy (es. `https://your-proxy.up.railway.app`).
3) Deploy.

## Note
- Le webcam pubbliche vengono aperte in `iframe` (nessun proxy necessario).
- Il bottone "Test HLS via Proxy" usa uno stream pubblico (Mux) e, se `VITE_PROXY_BASE` è presente, passa dal proxy per testarlo.
