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
  const videoRef = useRef(null)

  // Load markers.json
  useEffect(()=>{
    fetch('/markers.json')
      .then(r => r.json())
      .then(setMarkers)
      .catch(()=> setMarkers([]))
  }, [])

  // Scene
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

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const key = new THREE.DirectionalLight(0xfff0e0, 0.9); key.position.set(50,70,30); scene.add(key)
    const rim = new THREE.DirectionalLight(0x88aaff, 0.5); rim.position.set(-40,40,-20); scene.add(rim)

    // Districts
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

    // Roads
    const roadMat = new THREE.LineBasicMaterial({ })
    const makeLine = (x1,z1,x2,z2)=>{
      const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1,0.11,z1), new THREE.Vector3(x2,0.11,z2)])
      return new THREE.Line(geom, roadMat)
    }
    for(let z=-36; z<=36; z+=12){ const l = makeLine(-60,z,60,z); scene.add(l) }
    for(let x=-54; x<=54; x+=12){ const l = makeLine(x,-60,x,60); scene.add(l) }

    // Buildings
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

    // Markers
    const markerGeom = new THREE.SphereGeometry(0.8, 24, 18)
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0x220000, metalness: 0.25, roughness: 0.35 })
    const markerMeshes = []

    function rebuildMarkers(){
      markerMeshes.forEach(m => { scene.remove(m) })
      markerMeshes.length = 0
      markers.forEach(m=>{
        const mesh = new THREE.Mesh(markerGeom, markerMat)
        mesh.position.set(m.pos[0], 1.6, m.pos[2])
        mesh.userData = { id:m.id, name:m.name }
        scene.add(mesh); markerMeshes.push(mesh)
      })
    }
    rebuildMarkers()

    // Controls (drag horizontal inverted; WASD fixed as requested)
    const keys = {}
    window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true)
    window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false)
    let yaw = 0, pitch = -0.18
    el.addEventListener('mousemove', (e)=>{
      if(e.buttons===1){
        yaw += e.movementX * 0.0025      // inverted horizontal
        pitch -= e.movementY * 0.0025    // vertical same
        pitch = Math.max(-1.2, Math.min(0.3, pitch))
      }
    })
    function updateCamera(dt){
      const speed = (keys['shift']? 18: 9) * dt
      const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
      const r = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
      // FIX: normal mapping for WASD
      if(keys['w']) camera.position.addScaledVector(f, speed)
      if(keys['s']) camera.position.addScaledVector(f, -speed)
      if(keys['a']) camera.position.addScaledVector(r, -speed)
      if(keys['d']) camera.position.addScaledVector(r, speed)
      const target = new THREE.Vector3().copy(camera.position).add(new THREE.Vector3(Math.sin(yaw), Math.tan(-pitch), Math.cos(yaw)))
      camera.lookAt(target)
    }

    // Raycast
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    function onMove(e){
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hit = raycaster.intersectObjects(markerMeshes)
      if(hit.length){
        const { id, name } = hit[0].object.userData
        setHovered({ id, name, x: e.clientX, y: e.clientY })
      } else {
        setHovered(null)
      }
    }
    function onClick(e){
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hit = raycaster.intersectObjects(markerMeshes)
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

  // Test HLS via proxy
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
    // priority: hlsUrl -> ytId -> iframeProxy (pageUrl) -> iframeUrl
    const hasHls = marker.hlsUrl && marker.hlsUrl.length > 0
    const hasYt = marker.ytId && marker.ytId.length > 0
    const hasPage = marker.pageUrl && marker.pageUrl.length > 0
    const hasIframe = marker.iframeUrl && marker.iframeUrl.length > 0

    if(hasHls){
      const src = PROXY_BASE ? `${PROXY_BASE}/proxy?url=${encodeURIComponent(marker.hlsUrl)}` : marker.hlsUrl
      return <div className="video-wrap"><VideoPlayer src={src} autoPlay /></div>
    }
    if(hasYt){
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
    if(hasPage && PROXY_BASE){
      const proxied = `${PROXY_BASE}/iframe?url=${encodeURIComponent(marker.pageUrl)}`
      return (
        <iframe
          title={marker.id}
          src={proxied}
          style={{width:'100%',height:'100%',border:0}}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      )
    }
    if(hasIframe){
      return (
        <iframe
          title={marker.id}
          src={marker.iframeUrl}
          style={{width:'100%',height:'100%',border:0}}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      )
    }
    return <div className="video-wrap" style={{color:'#fff'}}>Nessuna sorgente disponibile per questo marker.</div>
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
          <div style={{fontWeight:700}}>Tokyo Live 3D — Modern v3.1</div>
          <div style={{marginTop:6}}>Trascina (tasto sinistro) per guardarti intorno. WASD per muoverti. Clic sui marker rossi.</div>
          <div style={{marginTop:6}}>
            <button className="btn" onClick={()=>setShowTest(s=>!s)}>{showTest ? 'Chiudi HLS test' : 'Test HLS via Proxy'}</button>
            {PROXY_BASE ? <span className="badge">Proxy attivo</span> : <span className="badge" style={{background:'#a55'}}>Proxy non configurato</span>}
          </div>
        </div>
      </div>

      {hovered && <div className="marker-tooltip" style={{left:hovered.x, top:hovered.y}}>{hovered.name}</div>}

      <div className="legend">Marker caricati da <code>public/markers.json</code> — priorità: HLS → YouTube → iframe proxato → iframe diretto</div>

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
