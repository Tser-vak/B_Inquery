import * as THREE from 'three'
import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Center, PerspectiveCamera, Float, useProgress } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { getProject } from '@theatre/core'
import _studio from '@theatre/studio'
import extension from '@theatre/r3f/dist/extension'
import { SheetProvider, editable as e } from '@theatre/r3f'
import './App.css'
import { Model as TelikoModel } from './models/terrain/Teliko_model'
import { Model as BcgMod } from './models/terrain/neuronal_cell_environment_v1'
import { WhiteBlod } from './models/avatars/WhiteBlod'
import { Model as FixedTerrainComp } from './models/terrain/Fixed_terrain_comp'

const studio = _studio.extend ? _studio : _studio.default

// Initialize Theatre.js studio
studio.extend(extension)
studio.initialize()

const project = getProject('TheatreR3F')
const sheet = project.sheet('Scene')

function CameraManager({ zoomedIn }) {
  const { camera } = useThree()
  const controlsRef = useRef()

  // Starting position (outside view)
  const outPos = useMemo(() => new THREE.Vector3(60.16, -24.69, 23.50), [])
  const outTarget = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  // The coordinates you provided!
  const inPos = useMemo(() => new THREE.Vector3(2.59, 6.83, 2.82), [])
  const inTarget = useMemo(() => new THREE.Vector3(0.00, 0.00, 0.00), [])

  useFrame((state) => {
    // Only manage the camera in the generic zoomed out state
    if (!zoomedIn) {
      state.camera.position.lerp(outPos, 0.03)
      if (controlsRef.current) {
        controlsRef.current.target.lerp(outTarget, 0.03)
        controlsRef.current.update()
      }
    }
  })

  // When we switch to zoomedIn, instantly move the camera close to the avatar
  useEffect(() => {
    if (zoomedIn) {
      camera.position.set(0, 10, 15)
    }
  }, [zoomedIn, camera])

  // We always return OrbitControls now so the user can orbit/drag the view.
  return (
    <OrbitControls
      makeDefault
      ref={controlsRef}
      enablePan={false} // Disable standard panning so they don't drag the screen away from the character
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE // Binds right-click to changing the view (orbiting)
      }}
    />
  )
}

function BackgroundModels({ count = 200 }) {
  // useMemo guarantees we only calculate these random numbers once when the component initially loads!
  const models = useMemo(() => {
    return Array.from({ length: count }, () => ({
      // Spread them very far apart
      position: [
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 120
      ],
      // Randomize starting angle
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ],
      // That specific model is scaled remarkably small (0.01) inside its file!
      // We must multiply the scale greatly to actually see it!
      scale: 15 + Math.random() * 25
    }))
  }, [count])

  return (
    <group>
      {models.map((props, i) => (
        // The instances are now locked in place without any animation
        <group key={i} {...props}>
          <Center>
            {/* 👇 TODO 2: SWAP YOUR NEW MODEL TAG HERE 👇 */}
            {/* Change the tag below to your imported <MyNewBackgroundModel /> */}
            <BcgMod />
          </Center>
        </group>
      ))}
    </group>
  )
}

function RotatingTeliko({ zoomedIn }) {
  const groupRef = useRef()

  // This hook runs every frame
  useFrame((state, delta) => {
    // Only rotate when the camera is outside! (when zoomedIn is false)
    if (groupRef.current && !zoomedIn) {
      // X Axis = Tumbling forward/backward
      // Y Axis = Spinning horizontally like a turntable 
      // Z Axis = Spinning like a steering wheel
      groupRef.current.rotation.y -= delta * 0.5
    }
  })

  return (
    <e.group theatreKey="Teliko">
      <group ref={groupRef}>
        <Center>
          <TelikoModel />
        </Center>
      </group>
    </e.group>
  )
}

function CustomLoader({ show, onComplete }) {
  const { active, progress } = useProgress()
  
  // As soon as progress hits 100, wait 800ms before removing the loading screen.
  // This allows the user to see the "100%" feedback and creates a cinematic fade!
  useEffect(() => {
    // If it's no longer actively loading (or hits 100%), start the 800ms timer
    if (show && (!active || progress === 100)) {
      const timer = setTimeout(() => {
        if (onComplete) onComplete()
      }, 200)
      return () => clearTimeout(timer)
    }
    // We intentionally omit onComplete from dependencies because it's an inline 
    // lambda function in App.jsx. Including it causes the timer to constantly reset!
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, active, progress])

  if (!show) return null

  // Ensure progress never jumps backwards and shows 100 when done
  const displayProgress = Math.max(10, Math.round(progress))

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'black', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div style={{ width: '300px', height: '20px', backgroundColor: '#333', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ width: `${displayProgress}%`, height: '100%', backgroundColor: '#FFD700', transition: 'width 0.3s' }} />
      </div>
      <p style={{ color: '#FFD700', marginTop: '15px', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
        Loading Environment... {displayProgress}%
      </p>
    </div>
  )
}

function App() {
  const [zoomedIn, setZoomedIn] = useState(false)
  const [isOverlayVisible, setIsOverlayVisible] = useState(false)

  // Listen for the Enter key anywhere on the website
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        setZoomedIn(prev => {
          const nextState = !prev
          if (nextState) {
            // When transitioning TO the world, trigger the loading screen immediately
            setIsOverlayVisible(true)
          } else {
            // When transitioning BACK to intro, no loading screen is needed
            setIsOverlayVisible(false)
          }
          return nextState
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <CustomLoader show={isOverlayVisible} onComplete={() => setIsOverlayVisible(false)} />
      <div id="canvas-container" style={{ height: '100vh', width: '100vw' }}>
        <Canvas fov={75}>
        <SheetProvider sheet={sheet}>
          {/* Base ambient lighting to avoid pure black shadows */}
          <ambientLight intensity={0.35} color={[0.77, 0.73, 0.73]} />

          {/* Key light acting as the 'sun' to create shadows and structure */}
          <directionalLight position={[5, 10, 5]} intensity={1.5} color={[1, 0.95, 0.95]} />
          {/* Fill light from the back to softly illuminate the darker side */}
          <directionalLight position={[-5, 5, -5]} intensity={1.5} />

          {/* Environment map with lowered intensity to dim reflections */}
          <Environment preset="city" environmentIntensity={0.8} />
          <Suspense fallback={null}>
            {!zoomedIn && <RotatingTeliko zoomedIn={zoomedIn} />}
            {zoomedIn && (
              <Physics>
                <FixedTerrainComp />
                <WhiteBlod active={zoomedIn} position={[0, 8, 2]} />
              </Physics>
            )}
          </Suspense>
          <CameraManager zoomedIn={zoomedIn} />
        </SheetProvider>
      </Canvas>
    </div>
    </>
  )
}

export default App
