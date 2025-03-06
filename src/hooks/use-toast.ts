type ToastVariant = "default" | "destructive" | "success" | "warning"

interface ToastProps {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

export const toast = ({ title, description, variant = "default", duration = 3000 }: ToastProps) => {
  // Log to console for debugging
  console.log(`Toast: ${variant} - ${title}${description ? ` - ${description}` : ""}`)

  // Dispatch custom event for the Toaster component
  const event = new CustomEvent("toast", {
    detail: {
      title,
      description,
      variant,
      duration,
    },
  })

  window.dispatchEvent(event)
}

