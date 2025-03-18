import { Outlet } from "react-router-dom"
import { motion } from "framer-motion"
import { useEffect, useRef } from "react"
import * as THREE from "three"

export default function AuthPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Set up Three.js scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)

    // Add a glowing sphere
    const geometry = new THREE.SphereGeometry(2, 32, 32)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    })
    const sphere = new THREE.Mesh(geometry, material)
    scene.add(sphere)

    // Add ambient light
    const light = new THREE.AmbientLight(0x404040)
    scene.add(light)

    // Position the camera
    camera.position.z = 5

    // Animation variables
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    // Handle mouse move
    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener("mousemove", handleMouseMove)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)

      // Move the sphere based on mouse position
      targetX = mouseX * 2
      targetY = mouseY * 2
      sphere.position.x += (targetX - sphere.position.x) * 0.1
      sphere.position.y += (targetY - sphere.position.y) * 0.1

      // Rotate the sphere
      sphere.rotation.x += 0.01
      sphere.rotation.y += 0.01

      renderer.render(scene, camera)
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("resize", handleResize)
      renderer.dispose()
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Dark Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 animate-gradient-x"></div>

      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"></canvas>

      {/* Content Container */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md bg-gray-900/50 backdrop-blur-md rounded-lg shadow-2xl p-8 border border-gray-700/50"
      >
        <Outlet />
      </motion.div>
    </div>
  )
}