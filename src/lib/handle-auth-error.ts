import { clearSupabaseAuth } from "./clear-supabase-auth"
import { toast } from "../hooks/use-toast"

export function handleAuthError(error: any) {
  console.error("Auth error encountered:", error)

  // Check if error is auth-related
  const errorMessage = error?.message?.toLowerCase() || ""
  const isAuthError =
    errorMessage.includes("auth") ||
    errorMessage.includes("token") ||
    errorMessage.includes("session") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("permission")

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
    }, 1500)

    return true
  }

  return false
}

