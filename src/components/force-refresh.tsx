"use client"

import { RefreshCcw } from "lucide-react"
import { Button } from "./ui/button"
import { clearSupabaseAuth } from "../lib/clear-supabase-auth"

export function ForceRefresh() {
  const handleForceRefresh = () => {
    // Clear any stale auth tokens
    clearSupabaseAuth()

    // Hard reload the page
    window.location.href = "/"
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={handleForceRefresh}
        className="bg-white shadow-md flex items-center gap-2"
      >
        <RefreshCcw className="h-4 w-4" />
        <span>Force Refresh</span>
      </Button>
    </div>
  )
}

