import { createClient } from "@supabase/supabase-js"
import type { Database } from "../types"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables. Check your .env file.")
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      "Content-Type": "application/json",
    },
  },
  db: {
    schema: "public",
  },
  // Add debug logging in development
  ...(import.meta.env.DEV
    ? {
        debug: true,
      }
    : {}),
})

// Test the connection
async function testConnection() {
  try {
    const { data, error } = await supabase.from("profiles").select("count").limit(1)
    if (error) {
      console.error("Supabase connection test failed:", error)
    } else {
      console.log("Supabase connection test successful:", data)
    }
  } catch (err) {
    console.error("Unexpected error testing Supabase connection:", err)
  }
}

// Log when client is initialized
console.log("Supabase client initialized with URL:", supabaseUrl)
testConnection()

