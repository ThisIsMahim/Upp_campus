"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { Toaster } from "./components/ui/toaster"
import { AuthProvider, useAuth } from "./contexts/auth-context"
import Layout from "./components/layout"
import { checkTablesSetup } from "./lib/check-tables-setup"
import { ForceRefresh } from "./components/force-refresh"
import { checkAuthStatus } from "./lib/check-auth-status"

// Pages
import AuthPage from "./pages/auth/index"
import LoginForm from "./pages/auth/login-form"
import SignupForm from "./pages/auth/signup-form"
import FeedPage from "./pages/feed/index"
import ProfilePage from "./pages/profile/index"
import NotFound from "./pages/404"

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Only redirect if we're sure the user is not authenticated
    if (!isLoading && !isAuthenticated) {
      console.log("Not authenticated, redirecting to login")
      navigate("/auth/login", { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show loading instead of null to prevent flash of content
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}

// Auth route component - redirects to feed if already authenticated
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Only redirect if we're sure the user is authenticated
    if (!isLoading && isAuthenticated) {
      console.log("Already authenticated, redirecting to feed")
      navigate("/feed", { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show loading instead of null to prevent flash of content
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/feed" replace /> : <Navigate to="/auth/login" replace />}
      />

      <Route
        path="/auth"
        element={
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        }
      >
        <Route index element={<Navigate to="/auth/login" replace />} />
        <Route path="login" element={<LoginForm />} />
        <Route path="signup" element={<SignupForm />} />
      </Route>

      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <Layout>
              <FeedPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <ProfilePage />
            </Layout>
          </ProtectedRoute>
        }
      />
    {/* 404 catch-all route - must be last */}
      <Route path="*" element={<NotFound/>} />
    </Routes>
  )
}

export default function App() {
  const [tablesChecked, setTablesChecked] = useState(false)

  useEffect(() => {
    // Check if database tables are set up correctly, but only once
    if (!tablesChecked) {
      checkTablesSetup()
        .then((success) => {
          console.log("Database tables setup check completed:", success ? "OK" : "Failed")
          setTablesChecked(true)
        })
        .catch((error) => {
          console.error("Error during database tables setup check:", error)
          setTablesChecked(true)
        })

      // Also check auth status
      checkAuthStatus()
        .then((isAuthenticated) => {
          console.log("Auth status check completed:", isAuthenticated ? "Authenticated" : "Not authenticated")
        })
        .catch((error) => {
          console.error("Error during auth status check:", error)
        })
    }
  }, [tablesChecked])

  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
      <ForceRefresh />
    </AuthProvider>
  )
}

