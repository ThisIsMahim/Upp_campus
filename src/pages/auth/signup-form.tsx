"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/auth-context"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { Dialog } from "../../components/ui/dialog"
import { toast } from "../../hooks/use-toast"
import { supabase } from "../../lib/supabase"
import type { Campus } from "../../types"

export default function SignupForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    bio: "",
    avatar_url: "",
    campus_id: "",
  })
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [isLoadingCampuses, setIsLoadingCampuses] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNewCampusDialogOpen, setIsNewCampusDialogOpen] = useState(false)
  const [newCampusData, setNewCampusData] = useState({
    name: "",
    short_name: "",
    description: "",
  })
  const { signUp, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Load campuses on component mount
  useEffect(() => {
    async function loadCampuses() {
      try {
        setIsLoadingCampuses(true)
        console.log("Loading campuses...")

        const { data, error } = await supabase.from("campuses").select("*").order("name")

        if (error) {
          console.error("Error loading campuses:", error)
          throw error
        }

        console.log("Campuses loaded:", data?.length || 0, "campuses found")
        setCampuses(data || [])

        // Set default campus if available (MEC)
        const defaultCampus = data?.find((c) => c.short_name === "MEC")
        if (defaultCampus) {
          console.log("Default campus found:", defaultCampus.name)
          setFormData((prev) => ({
            ...prev,
            campus_id: defaultCampus.id,
          }))
        } else {
          console.log("No default campus (MEC) found")
        }
      } catch (error) {
        console.error("Error loading campuses:", error)
        toast({
          title: "Error",
          description: "Failed to load campuses. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCampuses(false)
      }
    }

    loadCampuses()
  }, [])

  // Redirect if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/feed")
    }
  }, [isAuthenticated, navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    console.log(`Form field changed: ${name} = ${value}`)
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
      setIsSubmitting(true)

      const { data, error } = await supabase
        .from("campuses")
        .insert([
          {
            name: newCampusData.name,
            short_name: newCampusData.short_name || null,
            description: newCampusData.description || null,
            created_by: null, // Will be updated after user creation
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
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Trim the username to check if it's empty after trimming
    const trimmedUsername = formData.username.trim()

    if (!formData.email || !formData.password || !trimmedUsername || !formData.campus_id) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields, including selecting a campus.",
        variant: "destructive",
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      })
      return
    }

    // Validate username format
    if (trimmedUsername.length < 3) {
      toast({
        title: "Invalid Username",
        description: "Username must be at least 3 characters long.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Update the form data with the trimmed username
      const updatedFormData = {
        ...formData,
        username: trimmedUsername,
      }

      await signUp(updatedFormData.email, updatedFormData.password, updatedFormData.username, {
        bio: updatedFormData.bio || null,
        avatar_url: updatedFormData.avatar_url || null,
        campus_id: updatedFormData.campus_id,
      })

      // Show verification message
      toast({
        title: "Account Created",
        description: "Please check your email to verify your account. You won't be able to post or use features until your email is verified.",
        variant: "default",
      })

      // Navigate to a verification pending page or login page
      navigate("/auth/verify-email")
    } catch (error) {
      console.error("Signup error:", error)
      // Error is already handled in the auth context
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-white rounded-lg shadow-lg border backdrop-blur-md opacity-50 hover:opacity-85 transition-all">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Create an Account</h1>
        <p className="text-sm text-muted-foreground mt-2">Enter your details to create your account</p>
      </div>

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
          <label htmlFor="email" className="text-sm font-medium">
            Email<span className="text-red-500">*</span>
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="name@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password<span className="text-red-500">*</span>
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password<span className="text-red-500">*</span>
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
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
            value={formData.avatar_url}
            onChange={handleChange}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="bio" className="text-sm font-medium">
            Bio (optional)
          </label>
          <Textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself..."
            rows={3}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingCampuses}>
          {isSubmitting ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <p>
          Already have an account?{" "}
          <a
            href="/auth/login"
            className="text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault()
              navigate("/auth/login")
            }}
          >
            Sign in
          </a>
        </p>
      </div>

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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Campus"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

