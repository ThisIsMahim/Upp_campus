"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "../../contexts/auth-context"
import { supabase } from "../../lib/supabase"
import { Dialog } from "../../components/ui/dialog"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { Button } from "../../components/ui/button"
import { toast } from "../../hooks/use-toast"
import type { Profile, Campus } from "../../types"
import FriendRequestButton from "../../components/friend-request-button"
import { useNavigate } from "react-router-dom"

export default function ProfilePage() {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [friendStatus, setFriendStatus] = useState<string | null>(null)
  const [campuses, setCampuses] = useState<Campus[]>([])
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

  const handleSessionRefresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      return true
    } catch (error) {
      console.error("Error refreshing session:", error)
      toast({
        title: "Session Expired",
        description: "Please login again",
        variant: "destructive"
      })
      navigate("/auth/login")
      return false
    }
  }, [navigate])

  const checkFriendStatus = useCallback(async (profileId: string) => {
    if (!user?.id || profileId === user.id) return;
  
    try {
      const { data, error } = await supabase
        .from("friend_requests")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${profileId}),` +
          `and(sender_id.eq.${profileId},receiver_id.eq.${user.id})`
        )
        .limit(1);
  
      if (error) throw error;
      setFriendStatus(data?.[0]?.status || null);
    } catch (error) {
      console.error("Error checking friend status:", error);
      if (error instanceof Error && error.message.includes("JWT")) {
        await handleSessionRefresh();
      }
    }
  }, [user?.id, handleSessionRefresh]);

  const loadProfileData = useCallback(async (userId: string) => {
    try {
      setIsLoading(true)
      
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (profileError) throw profileError
      
      setProfile(profileData)
      if (userId === user?.id) {
        setFormData({
          username: profileData.username || "",
          bio: profileData.bio || "",
          avatar_url: profileData.avatar_url || "",
          campus_id: profileData.campus_id || ""
        })
      }

      if (userId !== user?.id) {
        await checkFriendStatus(userId)
      }

      const { data: campusesData, error: campusesError } = await supabase
        .from("campuses")
        .select("*")
        .order("name")
      
      if (!campusesError && campusesData) {
        setCampuses(campusesData)
      }

    } catch (error) {
      console.error("Error loading profile:", error)
      setLoadError(error instanceof Error ? error.message : "Unknown error")
      
      if (error instanceof Error && error.message.includes("JWT")) {
        const refreshed = await handleSessionRefresh()
        if (refreshed) await loadProfileData(userId)
      }
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, checkFriendStatus, handleSessionRefresh])

  const createProfile = useCallback(async () => {
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

      const { data, error } = await supabase
        .from("profiles")
        .upsert([{
          id: user.id,
          username,
          email,
          campus_id,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single()

      if (error) throw error
      
      setProfile(data)
      setFormData({
        username: data.username || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
        campus_id: data.campus_id || "",
      })
      toast({
        title: "Profile Created",
        variant: "success"
      })
    } catch (error) {
      console.error("Error creating profile:", error)
      setLoadError(`Failed to create profile: ${error instanceof Error ? error.message : "Unknown error"}`)
      setDebugInfo({ error, user })
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const userId = params.get("id") || user?.id
    
    if (userId) {
      loadProfileData(userId)
    } else {
      setLoadError("No user specified")
      setIsLoading(false)
    }
  }, [user?.id, loadProfileData])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    try {
      setIsSaving(true)
      
      if (formData.username !== profile.username) {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("username", formData.username)
          .neq("id", user.id)

        if (count && count > 0) {
          throw new Error("Username already taken")
        }
      }

      const updates = {
        username: formData.username,
        bio: formData.bio || null,
        avatar_url: formData.avatar_url || null,
        campus_id: formData.campus_id,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single()

      if (error) throw error
      
      setProfile(data)
      setIsDialogOpen(false)
      toast({
        title: "Profile Updated",
        variant: "success"
      })

    } catch (error) {
      console.error("Update error:", error)
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
      
      if (error instanceof Error && error.message.includes("JWT")) {
        await handleSessionRefresh()
      }
    } finally {
      setIsSaving(false)
    }
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
        .insert([{
          name: newCampusData.name,
          short_name: newCampusData.short_name || null,
          description: newCampusData.description || null,
          created_by: user?.id || null,
        }])
        .select()
        .single()

      if (error) throw error
      
      setCampuses(prev => [...prev, data])
      setFormData(prev => ({
        ...prev,
        campus_id: data.id,
      }))
      setIsNewCampusDialogOpen(false)
      setNewCampusData({
        name: "",
        short_name: "",
        description: "",
      })
      toast({
        title: "Campus Created",
        variant: "success"
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleNewCampusChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewCampusData(prev => ({ ...prev, [name]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500">Loading profile...</p>
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
              <Button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/80">
                Retry
              </Button>
              <Button onClick={createProfile} className="bg-green-600 hover:bg-green-700">
                Create Profile
              </Button>
            </div>
            {debugInfo && (
              <div className="mt-8 text-left">
                <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
                <div className="bg-gray-100 p-4 rounded max-h-60 overflow-auto">
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
            <Button onClick={createProfile} className="bg-primary hover:bg-primary/80">
              Create Profile
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const currentCampus = campuses.find(c => c.id === profile.campus_id)

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-xl shadow-card p-8 space-y-8">
          <div className="flex items-center space-x-6">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/10"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=random`
                }}
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl text-primary">{profile.username.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{profile.username}</h1>
              <p className="text-gray-600">{profile.email}</p>
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
                ) : "Unknown Campus"}
              </p>
            </div>
          )}

          {user?.id !== profile.id && (
            <div className="pt-6 border-t">
              <FriendRequestButton
                userId={profile.id}
                initialStatus={friendStatus}
                onStatusChange={setFriendStatus}
              />
            </div>
          )}

          {user?.id === profile.id && (
            <div className="pt-6 border-t border-gray-200">
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-primary hover:bg-primary-600 text-white transition-colors"
              >
                Edit Profile
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} title="Edit Profile">
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username<span className="text-red-500">*</span>
            </label>
            <Input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
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
              >
                <option value="">Select a campus</option>
                {campuses.map(campus => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name} {campus.short_name && `(${campus.short_name})`}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={() => setIsNewCampusDialogOpen(true)}>
                Add New
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="avatar_url" className="text-sm font-medium">
              Avatar URL
            </label>
            <Input
              id="avatar_url"
              name="avatar_url"
              type="url"
              value={formData.avatar_url}
              onChange={handleChange}
              placeholder="https://example.com/avatar.jpg"
            />
            {formData.avatar_url && (
              <div className="mt-2">
                <img
                  src={formData.avatar_url}
                  alt="Avatar preview"
                  className="h-16 w-16 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.username)}&background=random`
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium">
              Bio
            </label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog isOpen={isNewCampusDialogOpen} onClose={() => setIsNewCampusDialogOpen(false)} title="Add New Campus">
        <form onSubmit={handleCreateCampus} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Campus Name<span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              name="name"
              value={newCampusData.name}
              onChange={handleNewCampusChange}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="short_name" className="text-sm font-medium">
              Short Name
            </label>
            <Input
              id="short_name"
              name="short_name"
              value={newCampusData.short_name}
              onChange={handleNewCampusChange}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              value={newCampusData.description}
              onChange={handleNewCampusChange}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewCampusDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Creating..." : "Create Campus"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}