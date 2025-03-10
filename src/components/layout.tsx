"use client"

import type React from "react"

import { type ReactNode, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/auth-context"
import { toast } from "../hooks/use-toast"
import { clearSupabaseAuth } from "../lib/clear-supabase-auth"

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { signOut, user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault()

    if (isSigningOut) return // Prevent multiple clicks

    try {
      setIsSigningOut(true)
      console.log("Handling sign out click")

      // Clear Supabase tokens from localStorage
      clearSupabaseAuth()

      // Call the signOut function from auth context
      await signOut()
     
    } catch (error) {
      console.error("Error signing out:", error)

      // Clear localStorage even in case of error
      clearSupabaseAuth()

      // Force redirect on error
      navigate("/auth/login")

      toast({
        title: "Sign Out Issue",
        description: "There was a problem signing out. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/feed" className="text-primary font-bold text-lg">
                Upp Campus
              </Link>
              <Link to="/feed" className="text-gray-700 hover:text-primary transition-colors">
                Feed
              </Link>
              <Link to="/profile" className="text-gray-700 hover:text-primary transition-colors">
                Profile
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated && (
                <>
                  <span className="text-sm text-gray-500">
                    {user?.user_metadata?.username || user?.email?.split("@")[0] || "User"}
                  </span>
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="text-sm text-gray-700 hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {isSigningOut ? "Signing Out..." : "Sign Out"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}

