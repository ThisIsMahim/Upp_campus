"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/auth-context"
import { supabase } from "../../lib/supabase"
import { Button } from "../../components/ui/button"
import type { Profile, Campus } from "../../types"
import { PostActions } from "../../components/post-actions"
import { CommentsSection } from "../../components/comments-section"
import { PostForm } from "../../components/post-form"

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [currentCampus, setCurrentCampus] = useState<Campus | null>(null)

  // Inside the FeedPage component, add state for likes and comments
  const [showComments, setShowComments] = useState<string | null>(null)
  const [postLikes, setPostLikes] = useState<Record<string, number>>({})
  const [postComments, setPostComments] = useState<Record<string, number>>({})
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({})

  // Update the useEffect that loads user profile and posts
  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout | null = null

    const loadUserProfileAndPosts = async () => {
      try {
        setIsLoading(true)

        if (!user?.id) {
          console.log("No user ID available for feed")
          if (isMounted) {
            setIsLoading(false)
          }
          return
        }

        console.log("Loading user profile and posts for user:", user.id)

        // Set a safety timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.error("Feed loading timed out after 10 seconds")
            setLoadError("Loading timed out. Please refresh the page.")
            setIsLoading(false)
          }
        }, 10000)

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
            setIsLoading(false)
          }
          return
        }

        if (!isMounted) return

        console.log("User profile loaded:", profile)
        setUserProfile(profile)

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
              setIsLoading(false)
            }
            return
          }

          if (!isMounted) return

          console.log("Campus loaded:", campusData)
          setCurrentCampus(campusData)

          // Try loading posts with a simpler query
          try {
            console.log("Loading posts...")
            const { data: postsData, error: postsError } = await supabase
              .from("posts")
              .select("*")
              .eq("campus_id", profile.campus_id)
              .order("created_at", { ascending: false })
              .limit(20) // Add a limit to prevent too much data

            if (postsError) {
              console.error("Error loading posts:", postsError)
              throw postsError
            }

            if (!isMounted) return

            if (!postsData || postsData.length === 0) {
              console.log("No posts found")
              setPosts([])
              setIsLoading(false)
              if (timeoutId) clearTimeout(timeoutId)
              return
            }

            console.log("Posts loaded:", postsData.length)

            // Load author data in batches
            const userIds = [...new Set(postsData.map((post) => post.user_id))]
            const { data: authors, error: authorsError } = await supabase
              .from("profiles")
              .select("id, username, avatar_url")
              .in("id", userIds)

            if (authorsError) {
              console.error("Error loading authors:", authorsError)
            }

            const authorMap = authors
              ? authors.reduce((map, author) => {
                  map[author.id] = author
                  return map
                }, {})
              : {}

            // Combine the data
            const enrichedPosts = postsData.map((post) => ({
              ...post,
              author: authorMap[post.user_id] || null,
              campus: campusData,
            }))

            if (isMounted) {
              setPosts(enrichedPosts)
            }
          } catch (error) {
            console.error("Error processing posts:", error)
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
        if (timeoutId) clearTimeout(timeoutId)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadUserProfileAndPosts()

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [user?.id])

  // Add this after loading posts in the useEffect
  useEffect(() => {
    const loadLikesAndComments = async () => {
      if (!posts.length) return

      try {
        // Load likes counts
        const postIds = posts.map((post) => post.id)
        const { data: likesData, error: likesError } = await supabase
          .from("likes")
          .select("likeable_id, user_id")
          .eq("likeable_type", "post")
          .in("likeable_id", postIds)

        if (likesError) throw likesError

        // Count likes per post and check user likes
        const likesCount: Record<string, number> = {}
        const userLiked: Record<string, boolean> = {}

        likesData?.forEach((like) => {
          likesCount[like.likeable_id] = (likesCount[like.likeable_id] || 0) + 1
          if (like.user_id === user?.id) {
            userLiked[like.likeable_id] = true
          }
        })

        setPostLikes(likesCount)
        setUserLikes(userLiked)

        // Load comments counts
        const { data: commentsData, error: commentsError } = await supabase
          .from("comments")
          .select("post_id")
          .in("post_id", postIds)

        if (commentsError) throw commentsError

        // Count comments per post
        const commentsCount: Record<string, number> = {}
        commentsData?.forEach((comment) => {
          commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1
        })

        setPostComments(commentsCount)
      } catch (error) {
        console.error("Error loading likes and comments:", error)
      }
    }

    loadLikesAndComments()
  }, [posts, user?.id])

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
      {userProfile && currentCampus && (
        <PostForm
          userProfile={userProfile}
          currentCampus={currentCampus}
          onPostCreated={(newPost) => {
            setPosts((prev) => [newPost, ...prev])
          }}
        />
      )}

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

              <PostActions
                postId={post.id}
                likesCount={postLikes[post.id] || 0}
                commentsCount={postComments[post.id] || 0}
                isLiked={!!userLikes[post.id]}
                onLikeChange={(liked) => {
                  setPostLikes((prev) => ({
                    ...prev,
                    [post.id]: (prev[post.id] || 0) + (liked ? 1 : -1),
                  }))
                  setUserLikes((prev) => ({
                    ...prev,
                    [post.id]: liked,
                  }))
                }}
                onCommentAdd={() => setShowComments(showComments === post.id ? null : post.id)}
                canDelete={post.user_id === user?.id}
                onDelete={() => {
                  setPosts((prev) => prev.filter((p) => p.id !== post.id))
                }}
              />

              {showComments === post.id && (
                <CommentsSection
                  postId={post.id}
                  onCommentCountChange={(count) => {
                    setPostComments((prev) => ({
                      ...prev,
                      [post.id]: count,
                    }))
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

