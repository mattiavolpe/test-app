import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import Hls from 'hls.js'

const PROXY_BASE = import.meta.env.VITE_PROXY_BASE || ''

// Optional: YouTube embed support (fill ytId if you have it)
// Prefer hlsUrl via proxy when available
const MARKERS = [
  { id:'shibuya', name:'Shibuya Scramble Crossing', pos:[0,0,0], iframeUrl:'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/tokyo-shibuya-scramble-crossing.html' },
  { id:'tokyo-tower', name:'Tokyo Tower', pos:[-16,0,-10], iframeUrl:'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/tokyo-tower.html' },
  { id:'asakusa', name:'Asakusa - Sensō-ji / Hōzōmon', pos:[18,0,-6], iframeUrl:'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/hozomon-gate-asakusa.html' },
  { id:'shinjuku', name:'Shinjuku - Kabukichō', pos:[-8,0,12], iframeUrl:'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/shinjuku-kabukicho.html' },
  { id:'ginza', name:'Ginza', pos:[10,0,10], iframeUrl:'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/tokyo-panorama.html' },
  { id:'skytree', name:'Tokyo Skytree', pos:[24,0,-2], iframeUrl:'https://www.webcamtaxi.com/en/japan/tokyo/tokyo-skytree.html' },
  { id:'fuji', name:'Mount Fuji (Fujikawaguchiko)', pos:[-24,0,4], iframeUrl:'https://www.skylinewebcams.com/en/webcam/japan/yamanashi-prefecture/fujikawaguchiko/mount-fuji.html' }
]

const DEMO_HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

export default function App(){
  const mountRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [showTest, setShowTest] = useState(false)
  const videoRef = useRef(null)

  // Renderer/scene/camera
  useEffect(()=>{
    const el = mountRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b0f14)

    // --- Center & framing ---
    const camera = new THREE.PerspectiveCamera(60, el.clientWidth/el.clientHeight, 0.1, 1000)
    camera.position.set(0, 26, 42)        // a bit higher & farther
    camera.lookAt(0, 0.5, 0)              // aim slightly above ground so the world sits center

    const renderer = new THREE.WebGLRenderer({ antialias:true })
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)

    // Lights with contrast
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const key = new THREE.DirectionalLight(0xfff0e0, 0.9); key.position.set(50,70,30); scene.add(key)
    const rim = new THREE.DirectionalLight(0x88aaff, 0.5); rim.position.set(-40,40,-20); scene.add(rim)

    // Colored districts (big flat shapes)
    const districtColors = [0x16202c, 0x1a2633, 0x0e151d, 0x1d2b38, 0x12202a]
    const district = new THREE.Group()
    for(let i=-2;i<=2;i++){
      for(let j=-2;j<=2;j++){
        const mat = new THREE.MeshStandardMaterial({ color: districtColors[(i+j+10)%districtColors.length], roughness:0.9, metalness:0.05 })
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 18), mat)
        mesh.position.set(i*18, 0, j*18)
        district.add(mesh)
      }
    }
    scene.add(district)

    // Simple "roads" as bright lines
    const roadMat = new THREE.LineBasicMaterial({ linewidth: 1 })
    const roadGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-60, 0.11, 0),
      new THREE.Vector3(60, 0.11, 0)
    ])
    for(let z=-36; z<=36; z+=12){
      const g = roadGeom.clone()
      const l = new THREE.Line(g, roadMat); l.position.z = z; scene.add(l)
    }
    const roadGeomV = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.11, -60),
      new THREE.Vector3(0, 0.11, 60)
    ])
    for(let x=-54; x<=54; x+=12){
      const g = roadGeomV.clone()
      const l = new THREE.Line(g, roadMat); l.position.x = x; scene.add(l)
    }

    // Buildings with varied palette and emissive windows
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

    // Markers (bigger & more contrast)
    const markerGeom = new THREE.SphereGeometry(0.8, 24, 18)
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0x220000, metalness: 0.25, roughness: 0.35 })
    const markers = []
    MARKERS.forEach(m=>{
      const mesh = new THREE.Mesh(markerGeom, markerMat)
      mesh.position.set(m.pos[0], 1.6, m.pos[2])
      mesh.userData = { id:m.id, name:m.name }
      scene.add(mesh); markers.push(mesh)
    })

    // Controls: invert horizontal drag (as requested)
    const keys = {}
    window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true)
    window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false)
    let yaw = 0, pitch = -0.18
    el.addEventListener('mousemove', (e)=>{
      if(e.buttons===1){
        yaw += e.movementX * 0.0025   // inverted
        pitch -= e.movementY * 0.0025 // vertical same
        pitch = Math.max(-1.2, Math.min(0.3, pitch))
      }
    })
    function updateCamera(dt){
      const speed = (keys['shift']? 18: 9) * dt
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
      if(keys['w']) camera.position.addScaledVector(forward, -speed)
      if(keys['s']) camera.position.addScaledVector(forward, speed)
      if(keys['a']) camera.position.addScaledVector(right, -speed)
      if(keys['d']) camera.position.addScaledVector(right, speed)
      const target = new THREE.Vector3().copy(camera.position).add(new THREE.Vector3(Math.sin(yaw), Math.tan(-pitch), Math.cos(yaw)))
      camera.lookAt(target)
    }

    // Raycast for click & hover
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let setHoveredExternal = null

    function handleHover(x, y){
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((x - rect.left) / rect.width) * 2 - 1
      mouse.y = -((y - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hit = raycaster.intersectObjects(markers)
      if(hit.length){
        const { id, name } = hit[0].object.userData
        setHovered({ id, name, x, y })
      } else {
        setHovered(null)
      }
    }

    function onMouseMove(e){ handleHover(e.clientX, e.clientY) }
    function onClick(e){
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hit = raycaster.intersectObjects(markers)
      if(hit.length){
        const id = hit[0].object.userData.id
        const mk = MARKERS.find(m => m.id === id)
        if(mk) setSelected(mk)
      }
    }
    renderer.domElement.addEventListener('mousemove', onMouseMove)
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
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('click', onClick)
      el.removeChild(renderer.domElement)
    }
  }, [])

  // Test HLS via proxy (autoplay muted)
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
    const [mode, setMode] = useState(marker.hlsUrl ? 'hls' : (marker.ytId ? 'youtube' : 'iframe'))
    const [iframeError, setIframeError] = useState(false)

    // If iframe doesn't load within 2.5s (X-Frame-Options), show fallback message
    const [iframeTimeoutPassed, setIframeTimeoutPassed] = useState(false)
    useEffect(()=>{
      if(mode !== 'iframe') return
      setIframeTimeoutPassed(false)
      const t = setTimeout(()=>setIframeTimeoutPassed(true), 2500)
      return ()=>clearTimeout(t)
    }, [mode, marker])

    if(mode === 'hls' && marker.hlsUrl){
      const src = PROXY_BASE ? `${PROXY_BASE}/proxy?url=${encodeURIComponent(marker.hlsUrl)}` : marker.hlsUrl
      return (
        <div className="video-wrap">
          <VideoPlayer src={src} autoPlay />
        </div>
      )
    }

    if(mode === 'youtube' && marker.ytId){
      return (
        <iframe
          title={marker.id}
          src={`https://www.youtube-nocookie.com/embed/${marker.ytId}?autoplay=1&mute=1`}
          style={{width:'100%',height:'100%',border:0}}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )
    }

    if(mode === 'iframe' && marker.iframeUrl && !iframeError){
      return (
        <>
          <iframe
            title={marker.id}
            src={marker.iframeUrl}
            style={{width:'100%',height:'100%',border:0}}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            onError={() => setIframeError(true)}
            onLoad={() => {/* loaded */}}
          />
          {iframeTimeoutPassed && (
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
              <div style={{background:'rgba(0,0,0,0.6)',color:'#fff',padding:12,borderRadius:8}}>
                Sorgente non embeddabile (X-Frame-Options/CSP). Apri in una nuova scheda o usa un URL HLS tramite proxy.
              </div>
            </div>
          )}
        </>
      )
    }

    return (
      <div className="video-wrap" style={{color:'#fff',padding:24,textAlign:'center'}}>
        <div style={{maxWidth:700}}>
          <h3>Impossibile mostrare la cam</h3>
          <p>Questa sorgente potrebbe bloccare l&apos;embedding. Se hai un URL HLS o una diretta YouTube, posso integrarla qui evitando il blocco.</p>
          {marker.iframeUrl && (
            <p><a href={marker.iframeUrl} target="_blank" rel="noreferrer">Apri la pagina della webcam in una nuova scheda</a></p>
          )}
        </div>
      </div>
    )
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
          <div style={{fontWeight:700}}>Tokyo Live 3D — Modern v2</div>
          <div style={{marginTop:6}}>Trascina (tasto sinistro) per guardarti intorno. WASD per muoverti. Clic sui marker rossi per aprire la webcam.</div>
          <div style={{marginTop:6}}>
            <button className="btn" onClick={()=>setShowTest(s=>!s)}>{showTest ? 'Chiudi HLS test' : 'Test HLS via Proxy'}</button>
            {PROXY_BASE ? <span className="badge">Proxy attivo</span> : <span className="badge" style={{background:'#a55'}}>Proxy non configurato</span>}
          </div>
        </div>
      </div>

      {hovered && <div className="marker-tooltip" style={{left:hovered.x, top:hovered.y}}>{hovered.name}</div>}

      <div className="legend">
        Marker: Shibuya • Tokyo Tower • Asakusa • Shinjuku • Ginza • Skytree • Mt. Fuji
      </div>

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
