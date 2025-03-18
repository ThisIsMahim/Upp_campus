import { Outlet } from "react-router-dom"
import { motion } from "framer-motion"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import WebGL from 'three/addons/capabilities/WebGL.js'
import { Vector2 } from 'three'

export default function AuthPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Check for WebGL2 support
    if (!WebGL.isWebGL2Available()) {
      const warning = WebGL.getWebGLErrorMessage()
      document.body.appendChild(warning)
      return
    }

    // Set up Scene with fog for depth
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x000000, 0.1)
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true,
      antialias: true,
      powerPreference: 'default',
      context: canvasRef.current.getContext('webgl2')
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    
    // Create a more complex geometry
    const geometry = new THREE.IcosahedronGeometry(2, 1)
    
    // Create custom shader material for better glow effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00ffff) },
        mousePosition: { value: new Vector2(0, 0) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        uniform float time;
        uniform vec2 mousePosition;
        
        void main() {
          vUv = uv;
          vNormal = normal;
          
          // Add wave effect
          vec3 pos = position;
          pos.x += sin(pos.y * 2.0 + time) * 0.1;
          pos.y += cos(pos.x * 2.0 + time) * 0.1;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        uniform vec3 color;
        uniform float time;
        
        void main() {
          float pulse = sin(time) * 0.5 + 0.5;
          float fresnel = pow(1.0 + dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          vec3 glow = color * (fresnel * pulse);
          
          gl_FragColor = vec4(glow, 0.5);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    })

    const sphere = new THREE.Mesh(geometry, material)
    scene.add(sphere)

    // Add better lighting
    const pointLight = new THREE.PointLight(0x00ffff, 1, 100)
    pointLight.position.set(5, 5, 5)
    scene.add(pointLight)

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
    scene.add(ambientLight)

    // Add particles for background effect
    const particlesGeometry = new THREE.BufferGeometry()
    const particlesCount = 2000
    const posArray = new Float32Array(particlesCount * 3)
    
    for(let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 20
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
    })
    
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial)
    scene.add(particlesMesh)

    camera.position.z = 5

    // Improved mouse handling with lerping
    let mouseX = 0
    let mouseY = 0
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) * 2 - 1
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener("mousemove", handleMouseMove)

    // Handle context loss
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      cancelAnimationFrame(animationFrameId)
    }

    const handleContextRestored = () => {
      animate()
    }

    canvasRef.current.addEventListener('webglcontextlost', handleContextLost)
    canvasRef.current.addEventListener('webglcontextrestored', handleContextRestored)

    let clock = new THREE.Clock()
    let animationFrameId: number
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      // Smooth mouse movement
      targetX = mouseX * 2
      targetY = mouseY * 2
      sphere.position.x += (targetX - sphere.position.x) * 0.02
      sphere.position.y += (targetY - sphere.position.y) * 0.02

      // Update shader uniforms
      material.uniforms.time.value = elapsedTime
      material.uniforms.mousePosition.value = new Vector2(mouseX, mouseY)

      // Rotate the sphere
      sphere.rotation.x += 0.003
      sphere.rotation.y += 0.005

      // Animate particles
      particlesMesh.rotation.x = elapsedTime * 0.05
      particlesMesh.rotation.y = elapsedTime * 0.075

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

    // Enhanced cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("resize", handleResize)
      canvasRef.current?.removeEventListener('webglcontextlost', handleContextLost)
      canvasRef.current?.removeEventListener('webglcontextrestored', handleContextRestored)
      
      // Properly dispose of Three.js resources
      geometry.dispose()
      material.dispose()
      scene.remove(sphere)
      renderer.dispose()
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Enhanced gradient background with animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 animate-gradient-x">
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)]" />
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 1,
          type: "spring",
          stiffness: 100,
          damping: 20
        }}
        className="relative z-10 w-full max-w-md bg-gray-900/30 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(0,255,255,0.1)] p-8 border border-cyan-500/20"
      >
        <Outlet />
      </motion.div>
    </div>
  )
}