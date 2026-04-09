import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export function WhiteBlod(props) {
  const group = useRef()
  const { scene } = useGLTF('/models/Avatars/white_blod.glb')
  
  // To allow for a custom starting height (e.g. resting on top of the Teliko model)
  const [baseHeight] = useState(props.position ? props.position[1] : 0)

  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false })
  
  // Track the current look target specifically to restore the cinematic zoom effect 
  // It starts exactly where outTarget was (0,0,0) and zooms over gracefully
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0))
  
  useEffect(() => {
    const downHandler = (e) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(key)) {
        setKeys((k) => ({ ...k, [key]: true }))
      }
    }
    const upHandler = (e) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(key)) {
        setKeys((k) => ({ ...k, [key]: false }))
      }
    }
    
    window.addEventListener('keydown', downHandler)
    window.addEventListener('keyup', upHandler)
    
    return () => {
      window.removeEventListener('keydown', downHandler)
      window.removeEventListener('keyup', upHandler)
    }
  }, [])

  const moveSpeed = 4
  const hopHeight = 0.8
  const hopSpeed = 12
  const hopTime = useRef(0)

  // Use useMemo to avoid recreating the vector on each frame
  const direction = new THREE.Vector3()

  useFrame((state, delta) => {
    if (!group.current) return
    // Only move if zoomed in context is passed, or by default just move it.
    // If you only want it to move when the scene is active/zoomed, we can check props.active
    if (props.active === false) return

    let isMoving = false
    direction.set(0, 0, 0)

    if (keys.w) direction.z -= 1
    if (keys.s) direction.z += 1
    if (keys.a) direction.x -= 1
    if (keys.d) direction.x += 1

    if (direction.length() > 0) {
      isMoving = true
      direction.normalize()
      
      const targetAngle = Math.atan2(direction.x, direction.z)
      
      let currentAngle = group.current.rotation.y
      let diff = targetAngle - currentAngle
      
      while (diff < -Math.PI) diff += Math.PI * 2
      while (diff > Math.PI) diff -= Math.PI * 2
      
      group.current.rotation.y += diff * 10 * delta
      
      group.current.position.addScaledVector(direction, moveSpeed * delta)
      
      group.current.position.y = baseHeight + Math.abs(Math.sin(hopTime.current)) * hopHeight
    } else {
      hopTime.current = 0
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, baseHeight, 15 * delta)
    }

    if (props.active) {
      // 3RD PERSON CAMERA FOLLOW LOGIC
      // First, calculate where the camera should be positioned (behind and slightly above)
      const idealCameraPos = new THREE.Vector3(0, 3, 6)
      
      // Calculate rotation offset based on the character's facing direction
      idealCameraPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), group.current.rotation.y)
      
      // Add the avatar's current world position
      idealCameraPos.add(group.current.position)
      
      // Smoothly interpolate the camera to the ideal position with a 0.03 factor for cinematic swoop!
      state.camera.position.lerp(idealCameraPos, 0.03)

      // Calculate where the camera should look (slightly above the avatar's feet)
      const idealLookAt = new THREE.Vector3()
      idealLookAt.copy(group.current.position).add(new THREE.Vector3(0, 1, 0))
      
      // Smoothly zoom the camera look target to avoid instant snapping
      currentLookAt.current.lerp(idealLookAt, 0.03)
      state.camera.lookAt(currentLookAt.current)

      // Sync inner orbit controls so zoom-out doesn't randomly snap its target
      if (state.controls && state.controls.target) {
        state.controls.target.copy(currentLookAt.current)
      }
    }
  })

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/models/Avatars/white_blod.glb')
