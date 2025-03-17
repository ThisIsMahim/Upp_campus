import React, { createContext, useContext, useState } from "react"

interface DropdownMenuContextType {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

const DropdownMenuContext = createContext<DropdownMenuContextType | undefined>(undefined)

export const DropdownMenu: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

export const DropdownMenuTrigger: React.FC<{
  children: React.ReactNode
  asChild?: boolean
}> = ({ children, asChild }) => {
  const context = useContext(DropdownMenuContext)
  if (!context) {
    throw new Error("DropdownMenuTrigger must be used within a DropdownMenu component")
  }
  const { isOpen, setIsOpen } = context

  const handleClick = () => {
    setIsOpen(!isOpen)
  }

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: handleClick,
    })
  }

  return (
    <button onClick={handleClick} className="focus:outline-none">
      {children}
    </button>
  )
}

export const DropdownMenuContent: React.FC<{
  children: React.ReactNode
  align?: "start" | "end"
  className?: string
}> = ({ children, align = "start", className }) => {
  const context = useContext(DropdownMenuContext)
  if (!context) {
    throw new Error("DropdownMenuContent must be used within a DropdownMenu component")
  }
  const { isOpen } = context

  if (!isOpen) return null

  return (
    <div
      className={`absolute z-50 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${
        align === "end" ? "right-0" : "left-0"
      } ${className}`}
    >
      {children}
    </div>
  )
}

export const DropdownMenuItem: React.FC<{
  children: React.ReactNode
  className?: string
  onClick?: () => void
}> = ({ children, className, onClick }) => {
  return (
    <div
      className={`block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}