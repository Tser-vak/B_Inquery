import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'

export function WhiteBlod(props) {
  const group = useRef()
  const rbRef = useRef()
  const { scene } = useGLTF('/models/Avatars/white_blod.glb')
  
  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false })
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

  const direction = new THREE.Vector3()

  useFrame((state, delta) => {
    if (!group.current || !rbRef.current) return
    if (props.active === false) return

    direction.set(0, 0, 0)
    if (keys.w) direction.z -= 1
    if (keys.s) direction.z += 1
    if (keys.a) direction.x -= 1
    if (keys.d) direction.x += 1

    if (direction.length() > 0) {
      direction.normalize()
      
      const targetAngle = Math.atan2(direction.x, direction.z)
      
      let currentAngle = group.current.rotation.y
      let diff = targetAngle - currentAngle
      
      while (diff < -Math.PI) diff += Math.PI * 2
      while (diff > Math.PI) diff -= Math.PI * 2
      
      group.current.rotation.y += diff * 10 * delta
      
      // Update Physics Velocity instead of static position
      rbRef.current.setLinvel({ x: direction.x * moveSpeed, y: rbRef.current.linvel().y, z: direction.z * moveSpeed }, true)
      
      hopTime.current += delta * hopSpeed
      group.current.position.y = Math.abs(Math.sin(hopTime.current)) * hopHeight
    } else {
      hopTime.current = 0
      rbRef.current.setLinvel({ x: 0, y: rbRef.current.linvel().y, z: 0 }, true)
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, 0, 15 * delta)
    }

    if (props.active) {
      const idealCameraPos = new THREE.Vector3(0, 3, 6)
      idealCameraPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), group.current.rotation.y)
      
      // Follow the physical body, not the internal hopping group
      const worldPos = rbRef.current.translation()
      idealCameraPos.add(worldPos)
      
      state.camera.position.lerp(idealCameraPos, 0.03)

      const idealLookAt = new THREE.Vector3()
      idealLookAt.copy(worldPos).add(new THREE.Vector3(0, 1, 0))
      
      currentLookAt.current.lerp(idealLookAt, 0.03)
      state.camera.lookAt(currentLookAt.current)

      if (state.controls && state.controls.target) {
        state.controls.target.copy(currentLookAt.current)
      }
    }
  })

  // Prevent double application of properties
  const { position, active, ...restProps } = props;

  return (
    <RigidBody 
      ref={rbRef} 
      position={position || [0, 8, 2]} 
      colliders={false} 
      enabledRotations={[false, false, false]} 
    >
      <CapsuleCollider args={[0.5, 0.5]} position={[0, 1, 0]} />
      <group ref={group} {...restProps} dispose={null}>
        <primitive object={scene} />
      </group>
    </RigidBody>
  )
}

useGLTF.preload('/models/Avatars/white_blod.glb')
