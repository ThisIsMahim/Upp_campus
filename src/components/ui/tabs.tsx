import React, { createContext, useContext } from "react"

interface TabsContextType {
  activeTab: string
  setActiveTab: (value: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

export const Tabs: React.FC<{
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}> = ({ value, onValueChange, children, className }) => {
  return (
    <TabsContext.Provider value={{ activeTab: value, setActiveTab: onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export const TabsList: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  return <div className={`flex space-x-2 ${className}`}>{children}</div>
}

export const TabsTrigger: React.FC<{
  value: string
  children: React.ReactNode
  className?: string
}> = ({ value, children, className }) => {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component")
  }
  const { activeTab, setActiveTab } = context

  return (
    <button
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeTab === value
          ? "bg-primary text-white"
          : "bg-transparent text-gray-500 hover:bg-gray-100"
      } ${className}`}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  )
}

export const TabsContent: React.FC<{
  value: string
  children: React.ReactNode
  className?: string
}> = ({ value, children, className }) => {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component")
  }
  const { activeTab } = context

  return activeTab === value ? <div className={className}>{children}</div> : null
}