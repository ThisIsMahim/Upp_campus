"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/auth-context"
import { supabase } from "../../lib/supabase"
import { Button } from "../../components/ui/button"
import { Textarea } from "../../components/ui/textarea"
import { toast } from "../../hooks/use-toast"
import type { Profile, Campus } from "../../types"

export default function FeedPage() {
  const { user } = useAuth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentCampus, setCurrentCampus] = useState<Campus | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadUserProfileAndPosts = async () => {
      try {
        setIsLoading(true)

        if (!user?.id) {
          console.log("No user ID available for feed")
          return
        }

        console.log("Loading user profile and posts for user:", user.id)

        // Load user profile first to get campus_id
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError) {
          console.error("Error loading user profile:", profileError)
          if (isMounted) {
            setLoadError(`Failed to load profile: ${profileError.message}`)
          }
          return
        }

        if (isMounted) {
          console.log("User profile loaded:", profile)
          setUserProfile(profile)
        }

        // Only load posts from user's campus
        if (profile.campus_id) {
          console.log("Loading posts for campus:", profile.campus_id)

          // First, get the campus details
          const { data: campusData, error: campusError } = await supabase
            .from("campuses")
            .select("*")
            .eq("id", profile.campus_id)
            .single()

          if (campusError) {
            console.error("Error loading campus:", campusError)
            if (isMounted) {
              setLoadError(`Failed to load campus: ${campusError.message}`)
            }
            return
          }

          if (isMounted) {
            console.log("Campus loaded:", campusData)
            setCurrentCampus(campusData)
          }

          // Try different query approaches to load posts
          try {
            // Approach 1: Simple query without joins
            console.log("Trying simple query approach...")
            const { data: postsData, error: postsError } = await supabase
              .from("posts")
              .select("*")
              .eq("campus_id", profile.campus_id)
              .order("created_at", { ascending: false })

            if (postsError) {
              console.error("Error with simple query:", postsError)
              throw postsError
            }

            if (postsData && postsData.length > 0) {
              console.log("Posts loaded with simple query:", postsData.length)

              // Now fetch the related data separately
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const postIds = postsData.map((post) => post.id)
              const userIds = postsData.map((post) => post.user_id)
              const campusIds = postsData.map((post) => post.campus_id)

              // Get unique IDs
              const uniqueUserIds = [...new Set(userIds)]
              const uniqueCampusIds = [...new Set(campusIds)]

              // Fetch authors
              const { data: authors, error: authorsError } = await supabase
                .from("profiles")
                .select("*")
                .in("id", uniqueUserIds)

              if (authorsError) {
                console.error("Error fetching authors:", authorsError)
              }

              // Fetch campuses
              const { data: campuses, error: campusesError } = await supabase
                .from("campuses")
                .select("*")
                .in("id", uniqueCampusIds)

              if (campusesError) {
                console.error("Error fetching campuses:", campusesError)
              }

              // Create a map for quick lookups
              const authorMap = authors
                ? authors.reduce((map, author) => {
                    map[author.id] = author
                    return map
                  }, {})
                : {}

              const campusMap = campuses
                ? campuses.reduce((map, campus) => {
                    map[campus.id] = campus
                    return map
                  }, {})
                : {}

              // Combine the data
              const enrichedPosts = postsData.map((post) => ({
                ...post,
                author: authorMap[post.user_id] || null,
                campus: campusMap[post.campus_id] || null,
              }))

              if (isMounted) {
                setPosts(enrichedPosts)
              }
            } else {
              console.log("No posts found with simple query")
              if (isMounted) {
                setPosts([])
              }
            }
          } catch (error) {
            console.error("Error loading posts:", error)
            if (isMounted) {
              setLoadError(`Failed to load posts: ${error instanceof Error ? error.message : "Unknown error"}`)
            }
          }
        } else {
          console.log("User has no campus selected")
        }
      } catch (error) {
        console.error("Unexpected error loading feed:", error)
        if (isMounted) {
          setLoadError(`An unexpected error occurred: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadUserProfileAndPosts()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  const handleSubmitPost = async (e: React.FormEvent) => {
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
        created_at: new Date().toISOString(),
      }

      console.log("Creating new post:", newPost)

      // Insert the post
      const { data, error } = await supabase.from("posts").insert([newPost]).select("*").single()

      if (error) throw error

      console.log("Post created successfully:", data)

      // Fetch the author and campus data
      const { data: author, error: authorError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user_id)
        .single()

      if (authorError) {
        console.error("Error fetching author:", authorError)
      }

      const { data: campus, error: campusError } = await supabase
        .from("campuses")
        .select("*")
        .eq("id", data.campus_id)
        .single()

      if (campusError) {
        console.error("Error fetching campus:", campusError)
      }

      // Add the post to the state with author and campus
      const enrichedPost = {
        ...data,
        author: author || null,
        campus: campus || null,
      }

      setPosts((prev) => [enrichedPost, ...prev])
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-4">Error Loading Feed</h1>
          <p className="text-gray-600 mb-6">{loadError}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!userProfile?.campus_id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 text-center">
          <h1 className="text-xl font-semibold mb-4">No Campus Selected</h1>
          <p className="text-gray-600 mb-6">You need to select a campus in your profile to see posts.</p>
          <Button
            onClick={() => (window.location.href = "/profile")}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80"
          >
            Go to Profile
          </Button>
        </div>
      </div>
    )
  }

  const campusName = currentCampus?.name || "Your Campus"

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Feed - {campusName}</h1>

      {/* Create Post Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <form onSubmit={handleSubmitPost}>
          <div className="mb-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/80"
            >
              {isSubmitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">No posts yet. Be the first to post!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                {post.author?.avatar_url ? (
                  <img
                    src={post.author.avatar_url || "/placeholder.svg"}
                    alt={post.author.username}
                    className="h-10 w-10 rounded-full object-cover mr-3"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=random`
                    }}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    <span className="text-lg text-gray-500">
                      {post.author?.username?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold">{post.author?.username || "Unknown User"}</p>
                  <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</p>
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-line">{post.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

