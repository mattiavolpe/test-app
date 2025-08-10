# Tokyo Live 3D — Modern v3 (external markers.json)
- I marker sono definiti in **/public/markers.json** (niente più codice da toccare)
- Ogni marker supporta: `hlsUrl` (player via proxy), `ytId` (YouTube nocookie), `iframeUrl` (fallback)
- Mantiene: scena centrata, drag orizzontale invertito, colori/contrasto, tooltip, HLS test via proxy

## markers.json (esempio)
```json
[
  { "id":"shibuya", "name":"Shibuya", "pos":[0,0,0], "ytId":"_9pavMzUY-c", "iframeUrl":"https://www.webcamtaxi.com/en/japan/tokyo/shibuya-crossing.html", "hlsUrl":"" }
]
```

## Deploy Vercel
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_PROXY_BASE = https://<subdomain>.up.railway.app`
