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
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Use a ref to track if a sign out is in progress
  const isSigningOutRef = useRef(false)

  // Create a stable reference to the supabase client
  const supabaseClient = supabase

  // Function to update auth state
  const updateAuthState = useCallback((newSession: Session | null) => {
    console.log("Updating auth state:", newSession?.user?.id || "No session")
    setSession(newSession)
    setUser(newSession?.user || null)
    setIsAuthenticated(!!newSession)
    setIsLoading(false)
  }, [])

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth state...")
        // Get current session
        const { data } = await supabaseClient.auth.getSession()

        if (mounted) {
          if (data.session) {
            console.log("Found existing session:", data.session.user.id)
            updateAuthState(data.session)
          } else {
            console.log("No existing session found")
            updateAuthState(null)
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        if (mounted) {
          updateAuthState(null)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [supabaseClient, updateAuthState])

  // Set up auth state change listener
  useEffect(() => {
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
  }, [supabaseClient, updateAuthState, session])

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

      // Create auth user with metadata
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
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
      // Auth state will be updated by the listener

      toast({
        title: "Account Created",
        description: "Your account has been successfully created.",
        variant: "success",
      })

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
      isSigningOutRef.current = true
      setIsLoading(true)
      console.log("Signing out...")

      // Clear ALL Supabase-related tokens from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith("sb-") || key.includes("sb"))) {
          console.log(`Removing local storage item: ${key}`)
          localStorage.removeItem(key)
        }
      }

      // Also clear session storage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.startsWith("sb-") || key.includes("sb"))) {
          console.log(`Removing session storage item: ${key}`)
          sessionStorage.removeItem(key)
        }
      }

      // Also attempt the normal sign out process
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
        if (key && (key.startsWith("sb-") || key.includes("sb"))) {
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

