"use client"

import { useEffect, useState } from "react"

interface ToastProps {
  id: string
  title: string
  description?: string
  variant?: "default" | "destructive" | "success" | "warning"
  duration?: number
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  useEffect(() => {
    // Listen for toast events
    const handleToast = (event: CustomEvent<ToastProps>) => {
      const newToast = {
        ...event.detail,
        id: Math.random().toString(36).substring(2, 9),
      }
      setToasts((prev) => [...prev, newToast])

      // Auto-remove toast after duration
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
      }, event.detail.duration || 3000)
    }

    // Add event listener
    window.addEventListener("toast" as any, handleToast as any)

    // Clean up
    return () => {
      window.removeEventListener("toast" as any, handleToast as any)
    }
  }, [])

  return (
    <div className="fixed bottom-0 right-0 p-4 space-y-2 z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-md shadow-lg max-w-md transform transition-all duration-300 ease-in-out ${
            toast.variant === "destructive"
              ? "bg-red-600 text-white"
              : toast.variant === "success"
                ? "bg-green-600 text-white"
                : toast.variant === "warning"
                  ? "bg-yellow-500 text-white"
                  : "bg-white text-gray-900 border border-gray-200"
          }`}
        >
          <div className="font-medium">{toast.title}</div>
          {toast.description && <div className="text-sm mt-1">{toast.description}</div>}
        </div>
      ))}
    </div>
  )
}

