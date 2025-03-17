"use client"

import type React from "react"

import { useState, createContext, useContext, useEffect, useCallback, useRef, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"
import { toast } from "../hooks/use-toast"

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    username: string,
    profileData?: {
      bio?: string | null
      avatar_url?: string | null
      campus_id?: string | null
    },
  ) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authInitialized, setAuthInitialized] = useState(false)

  // Use a ref to track if a sign out is in progress
  const isSigningOutRef = useRef(false)
  // Use a ref to track ongoing refresh attempts
  const isRefreshingRef = useRef(false)
  // Use a ref to store the last active time
  const lastActiveTimeRef = useRef(Date.now())

  // Create a stable reference to the supabase client
  const supabaseClient = supabase

  // Function to update auth state
  const updateAuthState = useCallback((newSession: Session | null) => {
    console.log("Updating auth state:", newSession?.user?.id || "No session")
    setSession(newSession)
    setUser(newSession?.user || null)
    setIsAuthenticated(!!newSession)
    setIsLoading(false)
    if (newSession) {
      lastActiveTimeRef.current = Date.now()
    }
  }, [])

  // Function to refresh session
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) {
      console.log("Session refresh already in progress, skipping")
      return false
    }

    try {
      isRefreshingRef.current = true
      console.log("Attempting to refresh session...")

      // First try to get the current session
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession()

      if (sessionError) {
        console.error("Error getting session during refresh:", sessionError)
        throw sessionError
      }

      if (sessionData.session) {
        console.log("Found valid session during refresh:", sessionData.session.user.id)
        updateAuthState(sessionData.session)
        return true
      }

      // If no session, try to refresh the token
      console.log("No session found, attempting to refresh token...")
      const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession()

      if (refreshError) {
        console.error("Error refreshing token:", refreshError)
        throw refreshError
      }

      if (refreshData.session) {
        console.log("Session refreshed successfully:", refreshData.session.user.id)
        updateAuthState(refreshData.session)
        return true
      } else {
        console.log("No session after refresh attempt")
        updateAuthState(null)
        return false
      }
    } catch (error) {
      console.error("Session refresh failed:", error)
      updateAuthState(null)
      return false
    } finally {
      isRefreshingRef.current = false
    }
  }, [supabaseClient, updateAuthState])

  // Initialize auth state
  useEffect(() => {
    let mounted = true
    let recoveryTimeout: NodeJS.Timeout | null = null

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth state...")
        // Get current session
        const { data, error } = await supabaseClient.auth.getSession()

        if (error) {
          console.error("Error getting session during initialization:", error)
          if (mounted) {
            updateAuthState(null)
          }
          return
        }

        if (mounted) {
          if (data.session) {
            console.log("Found existing session:", data.session.user.id)
            updateAuthState(data.session)
          } else {
            console.log("No existing session found")
            updateAuthState(null)
          }
          setAuthInitialized(true)
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        if (mounted) {
          updateAuthState(null)
          setAuthInitialized(true)
        }
      }
    }

    // Set up a recovery mechanism in case initialization fails
    recoveryTimeout = setTimeout(() => {
      if (mounted && !authInitialized) {
        console.warn("Auth initialization timed out, forcing recovery...")
        updateAuthState(null)
        setAuthInitialized(true)
      }
    }, 5000) // 5 second timeout

    initializeAuth()

    return () => {
      mounted = false
      if (recoveryTimeout) {
        clearTimeout(recoveryTimeout)
      }
    }
  }, [supabaseClient, updateAuthState])

  // Set up auth state change listener after initialization
  useEffect(() => {
    if (!authInitialized) return

    console.log("Setting up auth state change listener")

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth state changed:", event, newSession?.user?.id)

      // If we're signing out, let the signOut function handle the state update
      if (event === "SIGNED_OUT" && isSigningOutRef.current) {
        console.log("Sign out detected, letting signOut function handle state update")
        return
      }

      // For TOKEN_REFRESHED events, just update the session but don't trigger profile creation
      if (event === "TOKEN_REFRESHED") {
        console.log("Token refreshed, updating session")
        updateAuthState(newSession)
        return
      }

      // Only update if the session actually changed
      if ((!session && newSession) || (session && !newSession) || session?.user?.id !== newSession?.user?.id) {
        console.log("Session changed, updating auth state")
        updateAuthState(newSession)
      } else {
        console.log("Session unchanged, skipping update")
      }

      // If a user just signed in, try to create their profile
      if (event === "SIGNED_IN" && newSession?.user) {
        try {
          const { data: existingProfile } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", newSession.user.id)
            .single()

          if (!existingProfile) {
            console.log("No profile found after sign in, creating one...")
            const username = newSession.user.user_metadata.username || "user"
            const email = newSession.user.email || ""
            const campus_id = newSession.user.user_metadata.campus_id || null

            const { error } = await supabaseClient.from("profiles").insert([
              {
                id: newSession.user.id,
                username,
                email,
                campus_id,
                created_at: new Date().toISOString(),
              },
            ])

            if (error) {
              console.error("Error creating profile after sign in:", error)
            } else {
              console.log("Profile created successfully after sign in")
            }
          }
        } catch (error) {
          console.error("Error handling profile after sign in:", error)
        }
      }
    })

    return () => {
      console.log("Cleaning up auth state change listener")
      subscription.unsubscribe()
    }
  }, [supabaseClient, updateAuthState, session, authInitialized])

  // Session activity monitor - check session periodically
  useEffect(() => {
    if (!authInitialized || !isAuthenticated) return

    const SESSION_CHECK_INTERVAL = 3 * 60 * 1000 // 3 minutes

    const checkSession = async () => {
      const timeSinceLastActive = Date.now() - lastActiveTimeRef.current

      // If it's been more than 10 minutes since last activity, refresh session
      if (timeSinceLastActive > 10 * 60 * 1000) {
        console.log("Long period of inactivity detected, checking session...")
        await refreshSession()
      }

      // Update the last active time
      lastActiveTimeRef.current = Date.now()
    }

    const intervalId = setInterval(checkSession, SESSION_CHECK_INTERVAL)

    // Also check session on visibility change (tab becomes active)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, checking session...")
        checkSession()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [authInitialized, isAuthenticated, refreshSession])

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      console.log("Signing in...")

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      console.log("Sign in successful:", data.user?.id)
      // Auth state will be updated by the listener

      toast({
        title: "Signed In",
        description: "You have successfully signed in.",
        variant: "success",
      })
    } catch (error) {
      console.error("Sign in error:", error)
      updateAuthState(null)
      toast({
        title: "Sign In Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Update the signUp function to include campus_id
  const signUp = async (
    email: string,
    password: string,
    username: string,
    profileData?: {
      bio?: string | null
      avatar_url?: string | null
      campus_id?: string | null
    },
  ) => {
    try {
      setIsLoading(true)
      console.log("Starting sign up process...")

      // Validate username
      if (!username || username.trim().length < 3) {
        throw new Error("Username must be at least 3 characters long")
      }

      // First, create the auth user
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
            ...(profileData?.bio && { bio: profileData.bio }),
            ...(profileData?.avatar_url && { avatar_url: profileData.avatar_url }),
            ...(profileData?.campus_id && { campus_id: profileData.campus_id }),
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error("User object is null after sign up")
      }

      console.log("Auth user created:", authData.user.id)

      // Use the database function to create the profile
      const { error: profileError } = await supabaseClient.rpc("create_user_profile", {
        user_id: authData.user.id,
        user_email: email,
        user_username: username.trim(),
        user_bio: profileData?.bio || null,
        user_avatar_url: profileData?.avatar_url || null,
        user_campus_id: profileData?.campus_id || null,
      })

      if (profileError) {
        console.error("Error creating profile:", profileError)
        throw new Error("Failed to create user profile: " + profileError.message)
      }

      console.log("Profile created successfully")

      toast({
        title: "Account Created",
        description: "Your account has been successfully created.",
        variant: "success",
      })

      // Update local state
      setUser(authData.user)
      setSession(authData.session)
      setIsAuthenticated(true)
    } catch (error) {
      console.error("Sign up error:", error)
      updateAuthState(null)
      toast({
        title: "Sign Up Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Update the signOut function to clear local storage tokens
  const signOut = async () => {
    try {
      // Set the signing out flag to true to prevent the auth state listener from interfering
      isSigningOutRef.current = true
      setIsLoading(true)
      console.log("Signing out...")

      // First, clear ALL Supabase-related tokens from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
          console.log(`Removing local storage item: ${key}`)
          localStorage.removeItem(key)
        }
      }

      // Also clear session storage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
          console.log(`Removing session storage item: ${key}`)
          sessionStorage.removeItem(key)
        }
      }

      // Also attempt the normal sign out process with global scope
      try {
        const { error } = await supabaseClient.auth.signOut({ scope: "global" })
        if (error) {
          console.warn("Error during Supabase sign out:", error)
          // Continue anyway, we've already cleared local storage
        }
      } catch (supabaseError) {
        console.warn("Exception during Supabase sign out:", supabaseError)
        // Continue anyway
      }

      // Manually update state regardless of the outcome
      console.log("Manually updating auth state after sign out")

      // Force reset all auth state
      setSession(null)
      setUser(null)
      setIsAuthenticated(false)

      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
        variant: "success",
      })

      return Promise.resolve()
    } catch (error) {
      console.error("Sign out error:", error)

      // Clear localStorage even in case of error
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
          console.log(`Removing local storage item: ${key}`)
          localStorage.removeItem(key)
        }
      }

      // Still update the state even if there was an error
      setSession(null)
      setUser(null)
      setIsAuthenticated(false)

      toast({
        title: "Sign Out Issue",
        description: "You have been signed out, but there was an issue.",
        variant: "warning",
      })

      return Promise.resolve()
    } finally {
      setIsLoading(false)
      isSigningOutRef.current = false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

