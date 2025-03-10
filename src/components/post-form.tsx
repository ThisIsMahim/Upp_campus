"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { toast } from "../hooks/use-toast"
import { supabase } from "../lib/supabase"
import { useAuth } from "../contexts/auth-context"
import type { Profile, Campus } from "../types"

interface PostFormProps {
  userProfile: Profile | null
  currentCampus: Campus | null
  onPostCreated: (newPost: any) => void
}

export function PostForm({ userProfile, currentCampus, onPostCreated }: PostFormProps) {
  const { user } = useAuth()
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      toast({
        title: "Empty Post",
        description: "Please enter some content for your post.",
        variant: "destructive",
      })
      return
    }

    if (!user?.id || !userProfile?.campus_id) {
      toast({
        title: "Error",
        description: "You must be logged in and have a campus selected to post.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const newPost = {
        user_id: user.id,
        campus_id: userProfile.campus_id,
        content,
        image_url: null, // Add image support later
      }

      console.log("Creating new post:", newPost)

      // Insert the post
      const { data, error } = await supabase.from("posts").insert([newPost]).select().single()

      if (error) {
        console.error("Error creating post:", error)
        throw error
      }

      console.log("Post created successfully:", data)

      // Fetch the author data
      const { data: author, error: authorError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", user.id)
        .single()

      if (authorError) {
        console.error("Error fetching author:", authorError)
      }

      // Create enriched post with author and campus
      const enrichedPost = {
        ...data,
        author: author || {
          id: user.id,
          username: user.user_metadata?.username || user.email?.split("@")[0] || "User",
          avatar_url: null,
        },
        campus: currentCampus,
      }

      // Call the callback with the new post
      onPostCreated(enrichedPost)
      setContent("")

      toast({
        title: "Post Created",
        description: "Your post has been published successfully.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error creating post:", error)
      toast({
        title: "Post Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="post-content" className="block text-sm font-medium text-gray-700 mb-2">
            Create a new post
          </label>
          <Textarea
            id="post-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="bg-gray-200 text-black px-4 py-2 rounded hover:bg-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Posting...
              </div>
            ) : (
              "Post"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

