import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'

export function WhiteBlod(props) {
  const group = useRef()
  const rbRef = useRef()
  const { scene } = useGLTF('/models/Avatars/white_blod.glb')

  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false, space: false })
  // Track if space was handled to prevent holding space from causing stutter hops
  const spaceHandled = useRef(false)
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    const downHandler = (e) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(key)) {
        setKeys((k) => ({ ...k, [key]: true }))
      } else if (key === ' ') {
        setKeys((k) => ({ ...k, space: true }))
      }
    }
    const upHandler = (e) => {
      const key = e.key.toLowerCase()
      if (['w', 'a', 's', 'd'].includes(key)) {
        setKeys((k) => ({ ...k, [key]: false }))
      } else if (key === ' ') {
        setKeys((k) => ({ ...k, space: false }))
        spaceHandled.current = false // Reset jump lock when released
      }
    }

    window.addEventListener('keydown', downHandler)
    window.addEventListener('keyup', upHandler)

    return () => {
      window.removeEventListener('keydown', downHandler)
      window.removeEventListener('keyup', upHandler)
    }
  }, [])

  const moveSpeed = 3.5 // <--- THIS controls how fast you walk straight ahead and sideways
  const hopHeight = 0.75 // Controls the bouncy visual "bob" height when walking
  const hopSpeed = 12 // Controls how fast the "bob" animation plays (speed of walking)
  const hopTime = useRef(0)
  const jumpCooldown = useRef(0)

  const direction = new THREE.Vector3()

  useFrame((state, delta) => {
    if (!group.current || !rbRef.current) return
    if (props.active === false) return

    if (jumpCooldown.current > 0) jumpCooldown.current -= delta

    const worldPos = rbRef.current.translation()
    if (worldPos.y < -20) {
      const startPos = props.position || [0, 8, 2]
      rbRef.current.setTranslation({ x: startPos[0], y: startPos[1], z: startPos[2] }, true)
      rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      return
    }

    direction.set(0, 0, 0)

    // Get the camera's forward and right directions so WASD always moves relative to your view!
    const camForward = new THREE.Vector3()
    state.camera.getWorldDirection(camForward)
    camForward.y = 0
    camForward.normalize()

    const camRight = new THREE.Vector3()
    camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize()

    // Apply movement based on screen axes rather than rigid world map directions
    if (keys.w) direction.add(camForward)
    if (keys.s) direction.sub(camForward)
    if (keys.a) direction.sub(camRight)
    if (keys.d) direction.add(camRight)

    if (direction.length() > 0) {
      direction.normalize()

      let targetAngle = Math.atan2(direction.x, direction.z) + Math.PI

      // Special rule for 'S': If backpedaling, don't spin around! Keep facing forward.
      if (keys.s && !keys.w && !keys.a && !keys.d) {
        targetAngle = Math.atan2(camForward.x, camForward.z) + Math.PI
      }

      let currentAngle = group.current.rotation.y
      let diff = targetAngle - currentAngle

      while (diff < -Math.PI) diff += Math.PI * 2
      while (diff > Math.PI) diff -= Math.PI * 2

      group.current.rotation.y += diff * 15 * delta // Sped up the turning so it snaps left/right better

      let velY = rbRef.current.linvel().y
      // Relaxed from 0.1 to 1.0 because walking on bumpy terrain causes small Y velocity jitters!
      if (keys.space && !spaceHandled.current && Math.abs(velY) < 1.0 && jumpCooldown.current <= 0) {
        velY = 22 // Increased jump power
        spaceHandled.current = true
        jumpCooldown.current = 1.25 // Blocks jumping again for ~1.25s (until you land)
      }

      // Update Physics Velocity instead of static position
      rbRef.current.setLinvel({ x: direction.x * moveSpeed, y: velY, z: direction.z * moveSpeed }, true)

      hopTime.current += delta * hopSpeed
      group.current.position.y = Math.abs(Math.sin(hopTime.current)) * hopHeight
    } else {
      let velY = rbRef.current.linvel().y
      if (keys.space && !spaceHandled.current && Math.abs(velY) < 1.0 && jumpCooldown.current <= 0) {
        velY = 22 // Increased jump power
        spaceHandled.current = true
        jumpCooldown.current = 1.25 // Blocks jumping again for ~1.25s (until you land)
      }

      hopTime.current = 0
      rbRef.current.setLinvel({ x: 0, y: velY, z: 0 }, true)
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, 0, 15 * delta)
    }

    if (props.active) {
      const worldPos = rbRef.current.translation()
      const idealLookAt = new THREE.Vector3()
      idealLookAt.copy(worldPos).add(new THREE.Vector3(0, 1, 0))

      currentLookAt.current.lerp(idealLookAt, 0.1)

      // ONLY chase the back if purely running forward (W).
      // Chasing on A, S, or D causes the camera to whip around wildly and fight your movement.
      if (keys.w && !keys.s && !keys.a && !keys.d) {
        const idealCameraPos = new THREE.Vector3(0, 3, 6)
        idealCameraPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), group.current.rotation.y)
        idealCameraPos.add(worldPos)
        state.camera.position.lerp(idealCameraPos, 0.03)
      }

      if (state.controls && state.controls.target) {
        state.controls.target.copy(currentLookAt.current)
        state.controls.update()
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
      friction={0}
      gravityScale={3.5} // Makes the avatar fall much faster and feel heavier
    >
      <CapsuleCollider args={[0.5, 0.5]} position={[0, 1, 0]} />
      <group ref={group} {...restProps} dispose={null}>
        <primitive object={scene} />
      </group>
    </RigidBody>
  )
}

useGLTF.preload('/models/Avatars/white_blod.glb')
