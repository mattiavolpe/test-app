# Tokyo Live 3D — Modern (Markers + Proxy-ready)

Pronto per Vercel:
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_PROXY_BASE = https://<subdomain>.up.railway.app`

Cosa include
- Three.js con scena 3D stilizzata di Tokyo e **7 marker** cliccabili
- Ogni marker apre **iframe** di webcam pubbliche realistiche
- Pulsante **Test HLS via Proxy** (usa Mux demo) per verificare proxy
- Autoplay (muted) per compatibilità Chrome/Safari/Firefox

Aggiungere nuove webcam
- Aggiungi un oggetto in `MARKERS` con `id`, `name`, `pos`, `iframeUrl`
- Se hai un vero HLS: mostrare in un player al posto dell’iframe
  `${import.meta.env.VITE_PROXY_BASE}/proxy?url=${encodeURIComponent(hlsUrl)}`
