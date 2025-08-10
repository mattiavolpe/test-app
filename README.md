# Tokyo Live 3D — Modern v3.2
- WASD definitivo (A/D corretti)
- Marker da /public/markers.json
- Click marker: HLS diretto (se presente) → YouTube → **estrazione HLS via backend** da qualunque pagina → iframe proxato → iframe
- Test HLS via proxy incluso (autoplay muted)

Vercel:
- Build: npm run build
- Output: dist
- Env: VITE_PROXY_BASE = https://<subdomain>.up.railway.app
