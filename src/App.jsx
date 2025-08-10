import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import Hls from 'hls.js'

const CAMERA_LIST = [
  { id: 'shibuya', name: 'Shibuya Scramble Crossing', embedUrl: 'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/tokyo-shibuya-scramble-crossing.html', pos: [0, 0, 0] },
  { id: 'shinjuku', name: 'Shinjuku - Kabukichō', embedUrl: 'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/shinjuku-kabukicho.html', pos: [18, 0, -6] },
  { id: 'tokyo-tower', name: 'Tokyo Tower (panorama)', embedUrl: 'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/tokyo-tower.html', pos: [-12, 0, -18] },
  { id: 'asakusa', name: 'Asakusa - Senso-ji / Hōzōmon', embedUrl: 'https://www.skylinewebcams.com/en/webcam/japan/kanto/tokyo/hozomon-gate-asakusa.html', pos: [-24, 0, 6] }
]

const DEMO_HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

export default function App () {
  const mountRef = useRef(null)
  const [selectedCam, setSelectedCam] = useState(null)
  const [showHlsTest, setShowHlsTest] = useState(false)
  const videoRef = useRef(null)
  const PROXY_BASE = import.meta.env.VITE_PROXY_BASE || ''

  useEffect(() => {
    const el = mountRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xbfd1e5)
    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 1000)
    camera.position.set(0, 30, 40)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(el.clientWidth, el.clientHeight)
    el.appendChild(renderer.domElement)

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)
    hemi.position.set(0, 50, 0); scene.add(hemi)
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x222222 }))
    ground.rotation.x = -Math.PI/2; scene.add(ground)

    const blockMat = new THREE.MeshStandardMaterial({ color: 0x333a40 })
    for (let i=-4;i<=4;i++){ for (let j=-3;j<=3;j++){ if (Math.random()>0.35){ const h=2+Math.random()*10; const mesh=new THREE.Mesh(new THREE.BoxGeometry(6,h,6),blockMat); mesh.position.set(i*8+(Math.random()*2-1),h/2,j*8+(Math.random()*2-1)); scene.add(mesh) } } }

    const markerGeom = new THREE.SphereGeometry(0.6,16,12)
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0x440000 })
    const markers=[]; CAMERA_LIST.forEach(cam=>{ const m=new THREE.Mesh(markerGeom,markerMat); m.position.set(cam.pos[0],1.2,cam.pos[2]); m.userData={camId:cam.id}; scene.add(m); markers.push(m) })

    const raycaster=new THREE.Raycaster(); const mouse=new THREE.Vector2()
    function onClick(e){ const b=renderer.domElement.getBoundingClientRect(); mouse.x=((e.clientX-b.left)/b.width)*2-1; mouse.y=-((e.clientY-b.top)/b.height)*2+1; raycaster.setFromCamera(mouse,camera); const hit=raycaster.intersectObjects(markers); if(hit.length){ const cam=CAMERA_LIST.find(c=>c.id===hit[0].object.userData.camId); if(cam) setSelectedCam(cam) } }
    renderer.domElement.addEventListener('click', onClick)

    function onResize(){ camera.aspect=el.clientWidth/el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight) }
    window.addEventListener('resize', onResize)

    function animate(){ requestAnimationFrame(animate); renderer.render(scene, camera) } animate()

    return ()=>{ window.removeEventListener('resize', onResize); renderer.domElement.removeEventListener('click', onClick); el.removeChild(renderer.domElement) }
  }, [])

  useEffect(()=>{
    if(!showHlsTest) return
    const video=videoRef.current; if(!video) return
    const src = PROXY_BASE ? `${PROXY_BASE}/proxy?url=${encodeURIComponent(DEMO_HLS)}` : DEMO_HLS
    if(Hls.isSupported()){ const hls=new Hls(); hls.loadSource(src); hls.attachMedia(video); hls.on(Hls.Events.MANIFEST_PARSED, ()=>{ video.muted=true; video.play() }); return ()=>hls.destroy() }
    else if(video.canPlayType('application/vnd.apple.mpegurl')){ video.src=src; video.muted=true; video.play() }
  }, [showHlsTest, PROXY_BASE])

  return (
    <div className="app-shell">
      <div className="toolbar">
        <div style={{background:'rgba(255,255,255,0.9)',padding:8,borderRadius:8,fontSize:14}}>
          <div style={{fontWeight:700}}>Tokyo Live 3D — Hybrid (Fixed)</div>
          <div style={{marginTop:6}}>Click un marker rosso per aprire una webcam (iframe).</div>
          <div style={{marginTop:6}}>
            <button className="btn" onClick={()=>setShowHlsTest(s=>!s)}>{showHlsTest?'Chiudi HLS test':'Test HLS via Proxy'}</button>
            {PROXY_BASE ? <span className="badge">Proxy attivo</span> : <span className="badge" style={{background:'#a55'}}>Proxy non configurato</span>}
          </div>
        </div>
      </div>

      <div ref={mountRef} style={{width:'100%',height:'100vh'}} />

      {selectedCam && (
        <div className="overlay">
          <div className="iframe-card">
            <div className="iframe-header">
              <strong>{selectedCam.name}</strong>
              <button className="btn" onClick={()=>setSelectedCam(null)}>Close</button>
            </div>
            <div className="iframe-body">
              <iframe title={selectedCam.id} src={selectedCam.embedUrl} style={{width:'100%',height:'100%',border:0}} sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />
            </div>
          </div>
        </div>
      )}

      {showHlsTest && (
        <div className="overlay" onClick={()=>setShowHlsTest(false)}>
          <div className="iframe-card">
            <div className="iframe-header">
              <strong>HLS di test {PROXY_BASE ? '(via proxy)' : '(diretto)'}</strong>
              <button className="btn" onClick={()=>setShowHlsTest(false)}>Close</button>
            </div>
            <div className="iframe-body" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
              <video ref={videoRef} style={{width:'100%',height:'100%'}} controls playsInline muted />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
