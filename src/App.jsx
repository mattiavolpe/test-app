import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import Hls from 'hls.js'

const PROXY_BASE = import.meta.env.VITE_PROXY_BASE || ''
const DEMO_HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

export default function App(){
  const mountRef = useRef(null)
  const [markers, setMarkers] = useState([])
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [showTest, setShowTest] = useState(false)
  const [toast, setToast] = useState(null)
  const [debug, setDebug] = useState(false)
  const videoRef = useRef(null)

  useEffect(()=>{
    fetch('/markers.json')
      .then(r => { if(!r.ok) throw new Error('markers.json not found'); return r.json() })
      .then(setMarkers)
      .catch(err => { console.error(err); setToast('Errore nel caricamento dei marker.'); setMarkers([]) })
  }, [])

  useEffect(()=>{
    const el = mountRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b0f14)

    const camera = new THREE.PerspectiveCamera(60, el.clientWidth/el.clientHeight, 0.1, 1000)
    camera.position.set(0, 26, 42)
    camera.lookAt(0, 0.5, 0)

    const renderer = new THREE.WebGLRenderer({ antialias:true })
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const key = new THREE.DirectionalLight(0xfff0e0, 0.9); key.position.set(50,70,30); scene.add(key)
    const rim = new THREE.DirectionalLight(0x88aaff, 0.5); rim.position.set(-40,40,-20); scene.add(rim)

    const dcols = [0x16202c, 0x1a2633, 0x0e151d, 0x1d2b38, 0x12202a]
    const district = new THREE.Group()
    for(let i=-2;i<=2;i++){
      for(let j=-2;j<=2;j++){
        const mat = new THREE.MeshStandardMaterial({ color: dcols[(i+j+10)%dcols.length], roughness:0.9, metalness:0.05 })
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 18), mat)
        mesh.position.set(i*18, 0, j*18)
        district.add(mesh)
      }
    }
    scene.add(district)

    const roadMat = new THREE.LineBasicMaterial({ })
    const makeLine = (x1,z1,x2,z2)=>{
      const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1,0.11,z1), new THREE.Vector3(x2,0.11,z2)])
      return new THREE.Line(geom, roadMat)
    }
    for(let z=-36; z<=36; z+=12){ const l = makeLine(-60,z,60,z); scene.add(l) }
    for(let x=-54; x<=54; x+=12){ const l = makeLine(x,-60,x,60); scene.add(l) }

    const palette = [0x3b6ea8, 0x4a90e2, 0x6ec1e4, 0xa8c0ff, 0x8ea6c9, 0x637a99]
    const blockGroup = new THREE.Group()
    const rand = (a,b)=>a+Math.random()*(b-a)
    for(let i=-6;i<=6;i++){
      for(let j=-5;j<=5;j++){
        if(Math.random()>0.25){
          const h = rand(1.5, 10.0)
          const mat = new THREE.MeshStandardMaterial({
            color: palette[Math.floor(Math.random()*palette.length)],
            emissive: (Math.random()>0.7) ? 0x111a22 : 0x000000,
            emissiveIntensity: 0.6,
            roughness: 0.75,
            metalness: 0.2
          })
          const box = new THREE.Mesh(new THREE.BoxGeometry(3.2, h, 3.2), mat)
          box.position.set(i*6 + rand(-0.6,0.6), h/2, j*6 + rand(-0.6,0.6))
          blockGroup.add(box)
        }
      }
    }
    scene.add(blockGroup)

    const markerGeom = new THREE.SphereGeometry(2.0, 28, 22)
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xff2e2e, emissive: 0x360000, metalness: 0.25, roughness: 0.3 })
    const beaconMat  = new THREE.MeshStandardMaterial({ color: 0xff2e2e, emissive: 0x3a0000, metalness: 0.1, roughness: 0.5, transparent:true, opacity:0.9 })
    const markerMeshes = []

    function rebuildMarkers(){
      markerMeshes.forEach(m => { scene.remove(m.mesh); scene.remove(m.beacon) })
      markerMeshes.length = 0
      markers.forEach(m=>{
        const mesh = new THREE.Mesh(markerGeom, markerMat)
        mesh.position.set(m.pos[0], 2.4, m.pos[2])
        mesh.userData = { id:m.id, name:m.name }
        const height = 8
        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, height, 16), beaconMat)
        beacon.position.set(m.pos[0], height/2, m.pos[2])
        scene.add(beacon); scene.add(mesh)
        markerMeshes.push({mesh, beacon})
      })
    }
    rebuildMarkers()

    const keys = {}
    window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true)
    window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false)
    let yaw = 0, pitch = -0.18
    el.addEventListener('mousemove', (e)=>{
      if(e.buttons===1){
        yaw += e.movementX * 0.0025
        pitch -= e.movementY * 0.0025
        pitch = Math.max(-1.2, Math.min(0.3, pitch))
      }
    })
    function updateCamera(dt){
      const speed = (keys['shift']? 18: 9) * dt
      const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
      const r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
      if(keys['w']) camera.position.addScaledVector(f, speed)
      if(keys['s']) camera.position.addScaledVector(f, -speed)
      if(keys['a']) camera.position.addScaledVector(r, speed)
      if(keys['d']) camera.position.addScaledVector(r, -speed)
      const target = new THREE.Vector3().copy(camera.position).add(new THREE.Vector3(Math.sin(yaw), Math.tan(-pitch), Math.cos(yaw)))
      camera.lookAt(target)
    }

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    function intersectMarkers(mx, my){
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((mx - rect.left) / rect.width) * 2 - 1
      mouse.y = -((my - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const objs = markerMeshes.map(o => o.mesh)
      return raycaster.intersectObjects(objs)
    }
    function onMove(e){
      const hit = intersectMarkers(e.clientX, e.clientY)
      if(hit.length){
        const { id, name } = hit[0].object.userData
        setHovered({ id, name, x: e.clientX, y: e.clientY })
      } else setHovered(null)
    }
    function onClick(e){
      const hit = intersectMarkers(e.clientX, e.clientY)
      if(hit.length){
        const id = hit[0].object.userData.id
        const mk = markers.find(m => m.id === id)
        if(mk) setSelected(mk)
      }
    }
    renderer.domElement.addEventListener('mousemove', onMove)
    renderer.domElement.addEventListener('click', onClick)

    function onResize(){
      camera.aspect = el.clientWidth/el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    }
    window.addEventListener('resize', onResize)

    let last = performance.now()
    function loop(t){
      const dt = (t - last)/1000; last = t
      updateCamera(dt)
      renderer.render(scene, camera)
      requestAnimationFrame(loop)
    }
    loop(last)

    return ()=>{
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('mousemove', onMove)
      renderer.domElement.removeEventListener('click', onClick)
      el.removeChild(renderer.domElement)
    }
  }, [markers])

  useEffect(()=>{
    if(!showTest) return
    const video = videoRef.current
    if(!video) return
    const src = PROXY_BASE ? `${PROXY_BASE}/proxy?url=${encodeURIComponent(DEMO_HLS)}` : DEMO_HLS
    const play = ()=>{ video.muted = true; const p = video.play(); if(p && p.catch) p.catch(()=>{}) }
    if(Hls.isSupported()){
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, play)
      return ()=>hls.destroy()
    }else if(video.canPlayType('application/vnd.apple.mpegurl')){
      video.src = src; play()
    }
  }, [showTest])

  function OverlayContent({ marker }){
    const [resolvedHls, setResolvedHls] = useState(null)
    const [resolvedYt, setResolvedYt] = useState(null)
    const [resolvedYtUrl, setResolvedYtUrl] = useState(null) // NEW: full embed URL
    const [state, setState] = useState('init')
    const [reason, setReason] = useState('')
    const [log, setLog] = useState([])

    useEffect(()=>{
      let cancelled = false
      async function resolve(){
        const L = (...a)=>{ setLog(x=>[...x, a.join(' ')]) }
        const page = marker.pageUrl || marker.iframeUrl
        if(marker.hlsUrl){ setResolvedHls(marker.hlsUrl); setState('hls'); L('hlsUrl diretto'); return }
        if(marker.ytId){ setResolvedYt(marker.ytId); setState('youtube'); L('ytId diretto'); return }
        if(page && PROXY_BASE){
          try{
            setState('loading'); L('getyoutube →', page)
            const rYT = await fetch(`${PROXY_BASE}/getyoutube?url=${encodeURIComponent(page)}`)
            L('getyoutube status', String(rYT.status))
            if(!cancelled && rYT.ok){
              const d = await rYT.json()
              L('getyoutube payload', JSON.stringify(d))
              if(d && d.fullUrl){ setResolvedYtUrl(d.fullUrl); setState('youtubeUrl'); return }
              if(d && d.id){ setResolvedYt(d.id); setState('youtube'); return }
            }
          }catch(e){ L('getyoutube error') }
          try{
            L('gethls →', page)
            const r = await fetch(`${PROXY_BASE}/gethls?url=${encodeURIComponent(page)}`)
            L('gethls status', String(r.status))
            if(!cancelled){
              if(r.ok){
                const data = await r.json(); L('gethls payload', JSON.stringify(data))
                if(data && data.url){ setResolvedHls(data.url); setState('hls'); return }
              }else{
                const txt = await r.text(); setReason(txt || `gethls ${r.status}`)
              }
            }
          }catch(e){ if(!cancelled) { setReason('gethls error'); L('gethls error') } }
        }
        if(!cancelled && marker.pageUrl && PROXY_BASE){ setState('iframeProxy'); L('fallback iframeProxy'); return }
        if(!cancelled && marker.iframeUrl){ setState('iframe'); L('fallback iframe'); return }
        if(!cancelled){ setState('fail'); L('fail') }
      }
      resolve()
      return ()=>{ cancelled = true }
    }, [marker])

    const debugBox = debug && (
      <div style={{position:'absolute',right:10,top:10,background:'rgba(0,0,0,0.6)',color:'#e8ecf3',padding:8,borderRadius:8,fontSize:12,maxWidth:'50%',whiteSpace:'pre-wrap'}}>
        {log.join('\n')}
      </div>
    )

    if(state === 'loading'){
      return <div className="video-wrap" style={{color:'#fff'}}>
        {debugBox}
        Ricerca dello stream…
      </div>
    }
    if(state === 'hls' && resolvedHls){
      const src = PROXY_BASE ? `${PROXY_BASE}/proxy?url=${encodeURIComponent(resolvedHls)}` : resolvedHls
      return <div className="video-wrap">{debugBox}<VideoPlayer src={src} autoPlay /></div>
    }
    if(state === 'youtubeUrl' && resolvedYtUrl){
      // Use the exact embed URL provided by backend (e.g., Skyline's iframe src)
      return (
        <div className="video-wrap">
          {debugBox}
          <iframe
            title={marker.id}
            src={resolvedYtUrl}
            style={{width:'100%',height:'100%',border:0}}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )
    }
    if(state === 'youtube' && (resolvedYt || marker.ytId)){
      const id = resolvedYt || marker.ytId
      return (
        <div className="video-wrap">
          {debugBox}
          <iframe
            title={marker.id}
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1`}
            style={{width:'100%',height:'100%',border:0}}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )
    }
    if(state === 'iframeProxy' && marker.pageUrl && PROXY_BASE){
      const proxied = `${PROXY_BASE}/iframe?url=${encodeURIComponent(marker.pageUrl)}`
      return <iframe title={marker.id} src={proxied} style={{width:'100%',height:'100%',border:0}} sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />
    }
    if(state === 'iframe' && marker.iframeUrl){
      return <iframe title={marker.id} src={marker.iframeUrl} style={{width:'100%',height:'100%'}} sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />
    }
    if(state === 'fail'){
      return <div className="video-wrap" style={{color:'#fff',padding:20,textAlign:'center'}}>
        {debugBox}
        <div>
          <h3>Nessuno stream trovato</h3>
          {reason && <div style={{opacity:0.8,marginTop:8,fontSize:13}}>Dettagli: {reason}</div>}
        </div>
      </div>
    }
    return null
  }

  function VideoPlayer({ src, autoPlay }){
    const ref = useRef(null)
    useEffect(()=>{
      const video = ref.current
      const play = ()=>{ video.muted=true; const p = video.play(); if(p && p.catch) p.catch(()=>{}) }
      if(Hls.isSupported()){
        const hls = new Hls()
        hls.loadSource(src)
        hls.attachMedia(video)
        if(autoPlay) hls.on(Hls.Events.MANIFEST_PARSED, play)
        return ()=>hls.destroy()
      }else if(video.canPlayType('application/vnd.apple.mpegurl')){
        video.src = src; if(autoPlay) play()
      }
    }, [src, autoPlay])
    return <video ref={ref} style={{width:'100%',height:'100%'}} controls playsInline muted />
  }

  return (
    <div className="app-shell">
      <div className="toolbar">
        <div style={{background:'rgba(255,255,255,0.92)',padding:8,borderRadius:8,fontSize:14,color:'#0b0f14'}}>
          <div style={{fontWeight:700}}>Tokyo Live 3D — Modern v3.8</div>
          <div style={{marginTop:6}}>Trascina (tasto sinistro) per guardarti intorno. WASD per muoverti. Clic sui marker rossi.</div>
          <div style={{marginTop:6,display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn" onClick={()=>setShowTest(s=>!s)}>{showTest ? 'Chiudi HLS test' : 'Test HLS via Proxy'}</button>
            <label style={{display:'inline-flex',gap:6,alignItems:'center',background:'#0c0f14',border:'1px solid #2a2f3a',padding:'6px 10px',borderRadius:8,color:'#e8ecf3'}}>
              <input type="checkbox" onChange={e=>setDebug(e.target.checked)} />
              Debug
            </label>
            {PROXY_BASE ? <span className="badge">Proxy attivo</span> : <span className="badge" style={{background:'#a55'}}>Proxy non configurato</span>}
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
      {hovered && <div className="marker-tooltip" style={{left:hovered.x, top:hovered.y}}>{hovered.name}</div>}

      <div className="legend">Priorità: HLS → YouTube (full URL se disponibile) → HLS/YouTube da pagina → iframe proxato → iframe</div>

      <div ref={mountRef} style={{width:'100%',height:'100vh'}} />

      {selected && (
        <div className="overlay">
          <div className="card">
            <div className="card-h">
              <strong>{selected.name}</strong>
              <button className="btn" onClick={()=>setSelected(null)}>Chiudi</button>
            </div>
            <div className="card-b" style={{position:'relative'}}>
              <OverlayContent marker={selected} />
            </div>
          </div>
        </div>
      )}

      {showTest && (
        <div className="overlay" onClick={()=>setShowTest(false)}>
          <div className="card">
            <div className="card-h">
              <strong>HLS di test {PROXY_BASE ? '(via proxy)' : '(diretto)'}</strong>
              <button className="btn" onClick={()=>setShowTest(false)}>Chiudi</button>
            </div>
            <div className="card-b">
              <div className="video-wrap">
                <video ref={videoRef} style={{width:'100%',height:'100%'}} controls playsInline muted autoPlay />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
