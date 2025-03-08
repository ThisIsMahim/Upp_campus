"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../contexts/auth-context"
import { supabase } from "../../lib/supabase"
import { Dialog } from "../../components/ui/dialog"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { Button } from "../../components/ui/button"
import { toast } from "../../hooks/use-toast"
import type { Profile, Campus } from "../../types"

export default function ProfilePage() {
  const { user, session } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Campus related state
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [isLoadingCampuses, setIsLoadingCampuses] = useState(true)
  const [isNewCampusDialogOpen, setIsNewCampusDialogOpen] = useState(false)
  const [newCampusData, setNewCampusData] = useState({
    name: "",
    short_name: "",
    description: "",
  })

  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    avatar_url: "",
    campus_id: "",
  })

  // Function to manually create a profile
  const createProfile = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a profile",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const username = user.user_metadata?.username || user.email?.split("@")[0] || "User"
      const email = user.email || ""
      const campus_id = user.user_metadata?.campus_id || null

      console.log("Manually creating profile with data:", {
        id: user.id,
        username,
        email,
        campus_id,
      })

      const { data, error } = await supabase
        .from("profiles")
        .upsert([
          {
            id: user.id,
            username,
            email,
            campus_id,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error creating profile:", error)
        setLoadError(`Failed to create profile: ${error.message}`)
        setDebugInfo({
          error,
          user: {
            id: user.id,
            email: user.email,
            metadata: user.user_metadata,
          },
          session: session
            ? {
                expires_at: session.expires_at,
                token_type: session.token_type,
              }
            : null,
        })
      } else {
        console.log("Profile created successfully:", data)
        setProfile(data)
        setFormData({
          username: data.username || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          campus_id: data.campus_id || "",
        })
        toast({
          title: "Profile Created",
          description: "Your profile has been created successfully",
          variant: "success",
        })
      }
    } catch (error) {
      console.error("Unexpected error creating profile:", error)
      setLoadError(`An unexpected error occurred: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    async function loadCampuses() {
      try {
        setIsLoadingCampuses(true)
        const { data, error } = await supabase.from("campuses").select("*").order("name")

        if (error) throw error

        if (isMounted) {
          setCampuses(data || [])
        }
      } catch (error) {
        console.error("Error loading campuses:", error)
      } finally {
        if (isMounted) {
          setIsLoadingCampuses(false)
        }
      }
    }

    async function loadProfile() {
      try {
        if (!user?.id) {
          console.log("No user ID available for profile fetch")
          if (isMounted) {
            setIsLoading(false)
            setLoadError("User not authenticated")
          }
          return
        }

        console.log("Fetching profile for user:", user.id)
        console.log("Auth state:", {
          isAuthenticated: !!session,
          userId: user.id,
          email: user.email,
          sessionExpiresAt: session?.expires_at,
        })

        // Set a timeout to prevent infinite loading
        timeoutRef.current = setTimeout(() => {
          if (isMounted && isLoading) {
            console.log("Profile fetch timed out after 10 seconds")
            setIsLoading(false)
            setLoadError("Request timed out. The server might be slow or unavailable.")
            setDebugInfo({
              user: {
                id: user.id,
                email: user.email,
                metadata: user.user_metadata,
              },
              session: session
                ? {
                    expires_at: session.expires_at,
                    token_type: session.token_type,
                  }
                : null,
              timeoutAt: new Date().toISOString(),
            })
          }
        }, 10000) // 10 second timeout

        // Test the connection to Supabase
        const { data: connectionTest, error: connectionError } = await supabase
          .from("profiles")
          .select("count")
          .limit(1)

        if (connectionError) {
          console.error("Connection test failed:", connectionError)
          if (isMounted) {
            setLoadError(`Connection to database failed: ${connectionError.message}`)
            setDebugInfo({ connectionError })
          }
          return
        }

        console.log("Connection test successful:", connectionTest)

        // Now try to fetch the actual profile
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        // Clear the timeout since we got a response
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }

        if (error) {
          console.error("Error fetching profile:", error)
          if (isMounted) {
            setLoadError(`Failed to load profile: ${error.message}`)
            setDebugInfo({
              error,
              user: {
                id: user.id,
                email: user.email,
                metadata: user.user_metadata,
              },
              session: session
                ? {
                    expires_at: session.expires_at,
                    token_type: session.token_type,
                  }
                : null,
            })
          }
        } else if (isMounted) {
          console.log("Profile loaded successfully:", data)
          setProfile(data)

          // Initialize form data with profile data
          setFormData({
            username: data.username || "",
            bio: data.bio || "",
            avatar_url: data.avatar_url || "",
            campus_id: data.campus_id || "",
          })
        }
      } catch (error) {
        console.error("Unexpected error loading profile:", error)
        if (isMounted) {
          setLoadError(`An unexpected error occurred: ${error instanceof Error ? error.message : "Unknown error"}`)
          setDebugInfo({ unexpectedError: error })
        }
      } finally {
        if (isMounted) {
          // Always set loading to false, even if there was an error
          setIsLoading(false)
        }
      }
    }

    loadCampuses()
    loadProfile()

    return () => {
      isMounted = false
      // Clear timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [user, session])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleNewCampusChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewCampusData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCreateCampus = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newCampusData.name) {
      toast({
        title: "Missing Information",
        description: "Campus name is required.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)

      const { data, error } = await supabase
        .from("campuses")
        .insert([
          {
            name: newCampusData.name,
            short_name: newCampusData.short_name || null,
            description: newCampusData.description || null,
            created_by: user?.id || null,
          },
        ])
        .select()
        .single()

      if (error) {
        throw error
      }

      // Add the new campus to the list and select it
      setCampuses((prev) => [...prev, data])
      setFormData((prev) => ({
        ...prev,
        campus_id: data.id,
      }))

      toast({
        title: "Campus Created",
        description: `${newCampusData.name} has been added successfully.`,
        variant: "success",
      })

      setIsNewCampusDialogOpen(false)
      setNewCampusData({
        name: "",
        short_name: "",
        description: "",
      })
    } catch (error) {
      console.error("Error creating campus:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create campus.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id || !profile) return

    try {
      setIsSaving(true)

      // Validate username and campus
      if (!formData.username.trim()) {
        toast({
          title: "Error",
          description: "Username cannot be empty",
          variant: "destructive",
        })
        return
      }

      if (!formData.campus_id) {
        toast({
          title: "Error",
          description: "Please select a campus",
          variant: "destructive",
        })
        return
      }

      const updates = {
        username: formData.username,
        bio: formData.bio || null,
        avatar_url: formData.avatar_url || null,
        campus_id: formData.campus_id,
        updated_at: new Date().toISOString(),
      }

      console.log("Updating profile:", updates)

      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)

      if (error) {
        console.error("Error updating profile:", error)
        throw error
      }

      console.log("Profile updated successfully")

      // Update local profile state
      setProfile({
        ...profile,
        ...updates,
      })

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
        variant: "success",
      })

      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500">Loading profile...</p>
        <p className="text-gray-400 text-sm mt-2">This may take a moment...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-red-600 mb-2">Error Loading Profile</h1>
            <p className="text-gray-600 mb-4">{loadError}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-2 mb-6">
              <Button
                onClick={() => window.location.reload()}
                className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80"
              >
                Retry
              </Button>
              <Button onClick={createProfile} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                Create Profile Manually
              </Button>
            </div>

            {debugInfo && (
              <div className="mt-8 text-left">
                <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
                <div className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
                  <pre className="text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold mb-4">No Profile Found</h1>
            <p className="text-gray-600 mb-6">We couldn't find your profile. Would you like to create one?</p>
            <Button onClick={createProfile} className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80">
              Create Profile
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const currentCampus = campuses.find((c) => c.id === profile.campus_id)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex items-center space-x-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url || "/placeholder.svg"}
                alt={profile.username}
                className="h-16 w-16 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=random`
                }}
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-2xl text-gray-500">{profile.username.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{profile.username}</h1>
              <p className="text-gray-500">{profile.email}</p>
            </div>
          </div>

          {profile.bio && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Bio</h2>
              <p className="text-gray-700">{profile.bio}</p>
            </div>
          )}

          {profile.campus_id && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Campus</h2>
              <p className="text-gray-700">
                {currentCampus ? (
                  <>
                    {currentCampus.name}
                    {currentCampus.short_name && ` (${currentCampus.short_name})`}
                  </>
                ) : (
                  "Unknown Campus"
                )}
              </p>
            </div>
          )}

          <div className="pt-6 border-t">
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              onClick={() => setIsDialogOpen(true)}
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} title="Edit Profile">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username<span className="text-red-500">*</span>
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="campus_id" className="text-sm font-medium">
              Campus<span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                id="campus_id"
                name="campus_id"
                value={formData.campus_id}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                required
                disabled={isLoadingCampuses}
              >
                <option value="">Select a campus</option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name} {campus.short_name ? `(${campus.short_name})` : ""}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={() => setIsNewCampusDialogOpen(true)} className="whitespace-nowrap">
                Add New
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="avatar_url" className="text-sm font-medium">
              Avatar URL (optional)
            </label>
            <Input
              id="avatar_url"
              name="avatar_url"
              type="url"
              value={formData.avatar_url || ""}
              onChange={handleChange}
              placeholder="https://example.com/avatar.jpg"
            />
            {formData.avatar_url && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-1">Preview:</p>
                <img
                  src={formData.avatar_url || "/placeholder.svg"}
                  alt="Avatar preview"
                  className="h-16 w-16 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.username)}&background=random`
                    toast({
                      title: "Invalid Image URL",
                      description: "Using a generated avatar instead",
                      variant: "warning",
                    })
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium">
              Bio (optional)
            </label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio || ""}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* New Campus Dialog */}
      <Dialog isOpen={isNewCampusDialogOpen} onClose={() => setIsNewCampusDialogOpen(false)} title="Add New Campus">
        <form onSubmit={handleCreateCampus} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Campus Name<span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={newCampusData.name}
              onChange={handleNewCampusChange}
              placeholder="e.g. Harvard University"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="short_name" className="text-sm font-medium">
              Short Name/Abbreviation (optional)
            </label>
            <Input
              id="short_name"
              name="short_name"
              type="text"
              value={newCampusData.short_name}
              onChange={handleNewCampusChange}
              placeholder="e.g. HU"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              id="description"
              name="description"
              value={newCampusData.description}
              onChange={handleNewCampusChange}
              placeholder="Brief description of the campus..."
              rows={3}
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setIsNewCampusDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              disabled={isSaving}
            >
              {isSaving ? "Creating..." : "Create Campus"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

