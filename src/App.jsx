import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import Hls from 'hls.js'

// Proxy base per HLS (Railway)
const PROXY_BASE = import.meta.env.VITE_PROXY_BASE || ''

// Dati marker: posizione "artistica" in una mappa 3D stilizzata di Tokyo
// iframeUrl: pagine di webcam pubbliche realistiche (embedding via sandbox)
const MARKERS = [
  {
    id: 'shibuya',
    name: 'Shibuya Scramble Crossing',
    pos: [0, 0, 0],
    iframeUrl: 'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/tokyo-shibuya-scramble-crossing.html'
  },
  {
    id: 'tokyo-tower',
    name: 'Tokyo Tower',
    pos: [-16, 0, -10],
    iframeUrl: 'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/tokyo-tower.html'
  },
  {
    id: 'asakusa',
    name: 'Asakusa - Sensō-ji / Hōzōmon',
    pos: [18, 0, -6],
    iframeUrl: 'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/hozomon-gate-asakusa.html'
  },
  {
    id: 'shinjuku',
    name: 'Shinjuku - Kabukichō',
    pos: [-8, 0, 12],
    iframeUrl: 'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/shinjuku-kabukicho.html'
  },
  {
    id: 'ginza',
    name: 'Ginza',
    pos: [10, 0, 10],
    iframeUrl: 'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/tokyo-panorama.html'
  },
  {
    id: 'skytree',
    name: 'Tokyo Skytree',
    pos: [24, 0, -2],
    iframeUrl: 'https://www.webcamtaxi.com/en/japan/tokyo/tokyo-skytree.html'
  },
  {
    id: 'fuji',
    name: 'Mount Fuji (Fujikawaguchiko)',
    pos: [-24, 0, 4],
    iframeUrl: 'https://www.skylinewebcams.com/en/webcam/japan/yamanashi-prefecture/fujikawaguchiko/mount-fuji.html'
  }
]

// Stream HLS demo per test player via proxy (stabile)
const DEMO_HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

export default function App() {
  const mountRef = useRef(null)
  const [selected, setSelected] = useState(null) // marker selezionato
  const [showHlsTest, setShowHlsTest] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current

    // Scene base
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0e1116)
    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 1000)
    camera.position.set(0, 24, 38)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)

    // Luci soft
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dir = new THREE.DirectionalLight(0xffffff, 0.6); dir.position.set(35, 50, 20); scene.add(dir)

    // Piano "mappa" con texture semplice (grid)
    const grid = new THREE.GridHelper(120, 60, 0x2a2f3a, 0x1a1f2a)
    grid.position.y = 0; scene.add(grid)

    // Blocchi stile "quartieri"
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x28303b, roughness: 0.8, metalness: 0.1 })
    const rand = (a,b)=>a+Math.random()*(b-a)
    for(let i=-6;i<=6;i++){
      for(let j=-5;j<=5;j++){
        if(Math.random()>0.3){
          const h = rand(1.2, 8)
          const box = new THREE.Mesh(new THREE.BoxGeometry(3, h, 3), blockMat)
          box.position.set(i*5+rand(-0.4,0.4), h/2, j*5+rand(-0.4,0.4))
          scene.add(box)
        }
      }
    }

    // Marker rossi
    const markerGeom = new THREE.SphereGeometry(0.6, 20, 14)
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0x330000, roughness: 0.4, metalness: 0.2})
    const markers = []
    MARKERS.forEach(m => {
      const mesh = new THREE.Mesh(markerGeom, markerMat)
      mesh.position.set(m.pos[0], 1.2, m.pos[2])
      mesh.userData = { id: m.id }
      scene.add(mesh)
      markers.push(mesh)
    })

    // Controlli "street-view like": orbit + WASD
    const keys = {}
    window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true)
    window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false)

    let yaw = 0, pitch = -0.2
    el.addEventListener('mousemove', (e)=>{
      if(e.buttons===1){
        yaw -= e.movementX * 0.0025
        pitch -= e.movementY * 0.0025
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

    // Raycasting click marker
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    function onClick(event){
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hit = raycaster.intersectObjects(markers)
      if(hit.length){
        const id = hit[0].object.userData.id
        const mk = MARKERS.find(m => m.id === id)
        if(mk) setSelected(mk)
      }
    }
    renderer.domElement.addEventListener('click', onClick)

    // Resize
    function onResize(){
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // Loop
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
      renderer.domElement.removeEventListener('click', onClick)
      el.removeChild(renderer.domElement)
    }
  }, [])

  // HLS test via proxy (autoplay muted per policy browser)
  useEffect(() => {
    if (!showHlsTest) return
    const video = videoRef.current
    if (!video) return
    const src = PROXY_BASE ? `${PROXY_BASE}/proxy?url=${encodeURIComponent(DEMO_HLS)}` : DEMO_HLS
    const play = () => { video.muted = true; const p = video.play(); if (p && p.catch) p.catch(()=>{}) }

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, play)
      return () => hls.destroy()
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      play()
    }
  }, [showHlsTest])

  return (
    <div className="app-shell">
      <div className="toolbar">
        <div style={{background:'rgba(255,255,255,0.9)',padding:8,borderRadius:8,fontSize:14}}>
          <div style={{fontWeight:700}}>Tokyo Live 3D — Modern</div>
          <div style={{marginTop:6}}>Trascina con il mouse (tasto sinistro) per guardarti intorno. WASD per muoverti. Clic sui marker rossi per aprire la webcam.</div>
          <div style={{marginTop:6}}>
            <button className="btn" onClick={()=>setShowHlsTest(s=>!s)}>{showHlsTest ? 'Chiudi HLS test' : 'Test HLS via Proxy'}</button>
            {PROXY_BASE ? <span className="badge">Proxy attivo</span> : <span className="badge" style={{background:'#a55'}}>Proxy non configurato</span>}
          </div>
        </div>
      </div>

      <div className="legend">
        <div><b>Marker:</b> 1) Shibuya  2) Tokyo Tower  3) Asakusa  4) Shinjuku  5) Ginza  6) Skytree  7) Mt. Fuji</div>
        <div style={{opacity:0.7}}>Autoplay attivo (muted) per compatibilità Chrome/Safari/Firefox.</div>
      </div>

      <div ref={mountRef} style={{width:'100%',height:'100vh'}} />

      {selected && (
        <div className="overlay">
          <div className="card">
            <div className="card-h">
              <strong>{selected.name}</strong>
              <button className="btn" onClick={()=>setSelected(null)}>Chiudi</button>
            </div>
            <div className="card-b">
              <iframe
                title={selected.id}
                src={selected.iframeUrl}
                style={{width:'100%',height:'100%',border:0}}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          </div>
        </div>
      )}

      {showHlsTest && (
        <div className="overlay" onClick={()=>setShowHlsTest(false)}>
          <div className="card">
            <div className="card-h">
              <strong>HLS di test {PROXY_BASE ? '(via proxy)' : '(diretto)'}</strong>
              <button className="btn" onClick={()=>setShowHlsTest(false)}>Chiudi</button>
            </div>
            <div className="card-b" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
              <video ref={videoRef} style={{width:'100%',height:'100%'}} controls playsInline muted autoPlay />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
