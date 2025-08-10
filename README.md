# Tokyo Live 3D — Modern v3.1 (WASD fixed + iframe proxy)
- WASD corretto: W avanti, S indietro, A sinistra, D destra
- Marker da /public/markers.json
- Priorità sorgenti: hlsUrl → ytId → pageUrl (iframe proxato) → iframeUrl diretto
- Test HLS via proxy incluso (autoplay muted)
- Pronto per Vercel (Build: npm run build, Output: dist, Env: VITE_PROXY_BASE)

Nota: l'uso di /iframe per aggirare X-Frame-Options/CSP funziona finché i siti non applicano verifiche ulteriori; usa fonti autorizzate quando possibile.
