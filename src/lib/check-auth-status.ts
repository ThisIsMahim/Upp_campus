import { supabase } from "./supabase"
import { clearSupabaseAuth } from "./clear-supabase-auth"
import { toast } from "../hooks/use-toast"

export async function checkAuthStatus() {
  try {
    console.log("Checking auth status...")

    // Try to get the current session
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("Error checking auth status:", error)
      clearSupabaseAuth()
      return false
    }

    if (!data.session) {
      console.log("No active session found")
      clearSupabaseAuth()
      return false
    }

    // Check if the session is expired
    const now = Math.floor(Date.now() / 1000)
    if (data.session.expires_at && data.session.expires_at < now) {
      console.log("Session has expired")
      clearSupabaseAuth()
      return false
    }

    console.log("Valid session found")
    return true
  } catch (error) {
    console.error("Unexpected error checking auth status:", error)
    clearSupabaseAuth()
    return false
  }
}

export function handleAuthError(error: any) {
  console.error("Auth error encountered:", error)

  // Check if error is auth-related
  const errorMessage = typeof error?.message === "string" ? error.message.toLowerCase() : ""
  const isAuthError =
    errorMessage.includes("auth") ||
    errorMessage.includes("token") ||
    errorMessage.includes("session") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("permission") ||
    errorMessage.includes("jwt")

  if (isAuthError) {
    console.log("Auth-related error detected, clearing auth state")
    clearSupabaseAuth()

    toast({
      title: "Authentication Error",
      description: "Your session has expired. Please sign in again.",
      variant: "destructive",
    })

    // Redirect to login
    setTimeout(() => {
      window.location.href = "/auth/login"
    }, 1000)

    return true
  }

  return false
}

