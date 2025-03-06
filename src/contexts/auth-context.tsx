"use client"

import type React from "react"

import { useState, createContext, useContext, useEffect, type ReactNode } from "react"
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

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()

        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth state changed:", event)
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setIsAuthenticated(!!newSession)
      setIsLoading(false)

      // If a user just signed up, try to create their profile
      if (event === "SIGNED_IN" && newSession?.user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", newSession.user.id)
          .single()

        if (!existingProfile) {
          console.log("No profile found after sign in, creating one...")
          const username = newSession.user.user_metadata.username || "user"
          const email = newSession.user.email || ""

          const { error } = await supabase.from("profiles").insert([
            {
              id: newSession.user.id,
              username,
              email,
              created_at: new Date().toISOString(),
            },
          ])

          if (error) {
            console.error("Error creating profile after sign in:", error)
          } else {
            console.log("Profile created successfully after sign in")
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      setUser(data.user)
      setSession(data.session)
      setIsAuthenticated(true)
      toast({
        title: "Signed In",
        description: "You have successfully signed in.",
        variant: "success",
      })
    } catch (error) {
      console.error("Sign in error:", error)
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

  const signUp = async (
    email: string,
    password: string,
    username: string,
    profileData?: {
      bio?: string | null
      avatar_url?: string | null
    },
  ) => {
    try {
      setIsLoading(true)
      console.log("Starting sign up process...")

      // 1. Create auth user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            ...(profileData?.bio && { bio: profileData.bio }),
            ...(profileData?.avatar_url && { avatar_url: profileData.avatar_url }),
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error("User object is null after sign up")
      }

      console.log("Auth user created:", authData.user)

      // We'll let the auth state change listener handle profile creation
      // This ensures the JWT token is fully processed before trying to create the profile

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

  const signOut = async () => {
    try {
      setIsLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setIsAuthenticated(false)
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
        variant: "success",
      })
    } catch (error) {
      console.error("Sign out error:", error)
      toast({
        title: "Sign Out Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
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

