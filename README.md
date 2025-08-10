# Tokyo Live 3D — Modern v2
- Centro scena corretto e inquadratura più alta (mondo centrato)
- Drag orizzontale **invertito** (come richiesto); verticale invariata
- Colori e contrasto maggiorati (distretti colorati, strade, palette edifici, emissive)
- Tooltip sui marker
- Overlay smart (HLS via proxy > YouTube > iframe; timeout di 2.5s per rilevare iframe bloccati)
- Test HLS via proxy incluso (autoplay muted)

Vercel:
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_PROXY_BASE = https://<subdomain>.up.railway.app`
