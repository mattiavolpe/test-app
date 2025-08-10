# Tokyo Live 3D — Modern (centered + tooltips + HLS-first)

Pronto per Vercel:
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_PROXY_BASE = https://<subdomain>.up.railway.app`

Novità
- **Centro scena allineato al centro schermo** (telecamera iniziale corretta)
- **Tooltip on hover** sui marker (nome località)
- **Overlay smart**: usa HLS via proxy se `marker.hlsUrl` è presente, altrimenti iframe.
  Se l'iframe è bloccato (X-Frame-Options/CSP), mostra un messaggio di fallback.
- **Autoplay (muted)** per compatibilità Chrome/Safari/Firefox
