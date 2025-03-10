export function clearSupabaseAuth() {
    console.log("Clearing Supabase auth data from local storage")
  
    try {
      // Get all keys first to avoid issues with changing localStorage during iteration
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith("sb-") || key.includes("sb"))) {
          keysToRemove.push(key)
        }
      }
  
      // Now remove the keys
      keysToRemove.forEach((key) => {
        console.log(`Removing local storage item: ${key}`)
        localStorage.removeItem(key)
      })
  
      // Also clear session storage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.startsWith("sb-") || key.includes("sb"))) {
          console.log(`Removing session storage item: ${key}`)
          sessionStorage.removeItem(key)
        }
      }
  
      console.log("Successfully cleared Supabase auth data")
      return true
    } catch (error) {
      console.error("Error clearing Supabase auth data:", error)
      return false
    }
  }
  
  