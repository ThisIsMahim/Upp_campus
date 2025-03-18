"use client"

import { Link, useLocation } from "react-router-dom"
import { LogOut, Menu, X } from "lucide-react"
import { useAuth } from "../contexts/auth-context"
import { Button } from "./ui/button"
import NotificationBell from "./notification-bell"
import { useState } from "react"

export function Navbar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false) // State for mobile menu

  // Don't show navbar on auth pages
  if (location.pathname.startsWith("/auth")) {
    return null
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Logo and links */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-primary font-bold text-lg">
              UPP Campus
            </Link>

            {/* Desktop links (hidden on mobile) */}
            {user && (
              <div className="hidden md:flex items-center space-x-8">
                <Link to="/feed" className="text-gray-700 hover:text-primary transition-colors">
                  Feed
                </Link>
                <Link to="/friends" className="text-gray-700 hover:text-primary transition-colors">
                  Friends
                </Link>
                <Link to="/profile" className="text-gray-700 hover:text-primary transition-colors">
                  Profile
                </Link>
              </div>
            )}
          </div>

          {/* Right side: User actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <NotificationBell />
                <Button
                  variant="ghost"
                  onClick={signOut}
                  className="hidden md:flex text-gray-700 hover:text-primary transition-colors"
                >
                  <LogOut className="w-5 h-5 mr-1" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/auth" className="hidden md:block">
                <Button>Sign In</Button>
              </Link>
            )}

            {/* Mobile menu toggle button */}
            <button
              className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu (dropdown) */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="flex flex-col space-y-4 mt-4 pb-4">
              {user && (
                <>
                  <Link
                    to="/feed"
                    className="text-gray-700 hover:text-primary transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Feed
                  </Link>
                  <Link
                    to="/friends"
                    className="text-gray-700 hover:text-primary transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Friends
                  </Link>
                  <Link
                    to="/profile"
                    className="text-gray-700 hover:text-primary transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                </>
              )}

              {user ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    signOut()
                    setIsMobileMenuOpen(false)
                  }}
                  className="text-gray-700 hover:text-primary transition-colors"
                >
                  <LogOut className="w-5 h-5 mr-1" />
                  Sign Out
                </Button>
              ) : (
                <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button>Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}