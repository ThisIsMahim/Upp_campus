import type { ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/auth-context"

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate("/auth/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/feed" className="text-primary font-semibold text-lg">
                Your App
              </Link>
              <Link to="/feed" className="text-gray-700 hover:text-primary transition-colors">
                Feed
              </Link>
              <Link to="/profile" className="text-gray-700 hover:text-primary transition-colors">
                Profile
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{user?.user_metadata?.username}</span>
              <button onClick={handleSignOut} className="text-sm text-gray-700 hover:text-primary transition-colors">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}

