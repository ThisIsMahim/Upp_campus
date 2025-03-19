"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/auth-context"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { toast } from "../../hooks/use-toast"
import { Eye, EyeOff } from "lucide-react"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword]= useState(false)
  const { signIn, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Add effect to redirect when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/feed")
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      await signIn(email, password)
      // The redirect will happen in the useEffect above
    } catch (error) {
      console.error("Login error:", error)
      // Error is already handled in the auth context
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-white rounded-lg shadow-lg border backdrop-blur-lg opacity-90 hover:opacity-95 transition-all">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary">What's <span className="text-blue-500">Upp Campus!!</span> </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Connect with your campus community. Share, explore, and stay updated!
        </p>
      </div>
  
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            className="bg-background text-foreground border-border focus:ring-primary"
          />
        </div>
  
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <a href="#" className="text-sm text-primary hover:underline">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-background text-foreground border-border focus:ring-primary pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground hover:text-primary"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
  
        <Button type="submit" className="w-full bg-primary hover:bg-blue-500" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
      </form>
  
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Don't have an account?{" "}
          <a
            href="/auth/signup"
            className="text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault()
              navigate("/auth/signup")
            }}
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}

