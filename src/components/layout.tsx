"use client"

import { type ReactNode } from "react"
import { Navbar } from "./navbar" // Import the Navbar component

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar /> {/* Use the Navbar component */}
      <main>{children}</main>
    </div>
  )
}