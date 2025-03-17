"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/auth-context"
import { supabase } from "../../lib/supabase"
import { Button } from "../../components/ui/button"
import type { Profile, Campus } from "../../types"
import { PostActions } from "../../components/post-actions"
import { CommentsSection } from "../../components/comments-section"
import { PostForm } from "../../components/post-form"
import FriendRequestButton from "../../components/friend-request-button"
import { useNavigate } from "react-router-dom"

export default function FeedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [currentCampus, setCurrentCampus] = useState<Campus | null>(null)

  // State for likes, comments, and friend requests
  const [showComments, setShowComments] = useState<string | null>(null)
  const [postLikes, setPostLikes] = useState<Record<string, number>>({})
  const [postComments, setPostComments] = useState<Record<string, number>>({})
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({})
  const [friendStatuses, setFriendStatuses] = useState<Record<string, string | null>>({})

  // Load user profile and posts
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

          // Now load posts for this campus
          const { data: postsData, error: postsError } = await supabase
            .from("posts")
            .select(`
              *,
              author:profiles(id, username, avatar_url),
              likes(user_id, likeable_id),
              comments:comments(id)
            `)
            .eq("campus_id", profile.campus_id)
            .order("created_at", { ascending: false })

          if (postsError) {
            console.error("Error loading posts:", postsError)
            if (isMounted) {
              setLoadError(`Failed to load posts: ${postsError.message}`)
              setIsLoading(false)
            }
            return
          }

          if (!isMounted) return

          console.log("Posts loaded:", postsData.length)
          setPosts(postsData)

          // Process likes and comments for each post
          const likesMap: Record<string, number> = {}
          const commentsMap: Record<string, number> = {}
          const userLikesMap: Record<string, boolean> = {}

          postsData.forEach((post) => {
            likesMap[post.id] = post.likes ? post.likes.length : 0
            commentsMap[post.id] = post.comments ? post.comments.length : 0
            userLikesMap[post.id] = post.likes ? post.likes.some((like: any) => like.user_id === user.id) : false
          })

          setPostLikes(likesMap)
          setPostComments(commentsMap)
          setUserLikes(userLikesMap)

          // Check friend status for each post's author
          const friendStatusMap: Record<string, string | null> = {}
          for (const post of postsData) {
            if (post.author.id !== user.id) {
              const { data: friendData, error: friendError } = await supabase
  .from("friend_requests")
  .select("*")
  .or(
    `sender_id.eq.${user.id}.and.receiver_id.eq.${post.author.id},sender_id.eq.${post.author.id}.and.receiver_id.eq.${user.id}`
  )
  .limit(1);

              if (friendError) {
                console.error("Error checking friend status:", friendError)
              } else if (friendData && friendData.length > 0) {
                friendStatusMap[post.author.id] = friendData[0].status
              } else {
                friendStatusMap[post.author.id] = null
              }
            }
          }

          setFriendStatuses(friendStatusMap)
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

  // Handle post creation
  const handlePostCreated = (newPost: any) => {
    setPosts((prevPosts) => [newPost, ...prevPosts])
  }

  // Handle post deletion
  const handlePostDeleted = (postId: string) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId))
  }

  // Handle like updates
  const handleLikeUpdated = (postId: string, liked: boolean) => {
    setUserLikes((prev) => ({ ...prev, [postId]: liked }))
    setPostLikes((prev) => ({
      ...prev,
      [postId]: liked ? (prev[postId] || 0) + 1 : Math.max(0, (prev[postId] || 0) - 1),
    }))
  }

  // Handle comment count updates
  const handleCommentCountUpdated = (postId: string, count: number) => {
    setPostComments((prev) => ({ ...prev, [postId]: count }))
  }

  // Handle friend status updates
  const handleFriendStatusChange = (userId: string, status: string | null) => {
    setFriendStatuses((prev) => ({ ...prev, [userId]: status }))
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
            className="bg-primary text-black px-4 py-2 rounded hover:bg-primary/80"
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
            onClick={() => navigate("/profile")}
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
          onPostCreated={handlePostCreated}
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
                    className="h-10 w-10 rounded-full object-cover mr-3 cursor-pointer"
                    onClick={() => navigate(`/profile/${post.author.id}`)}
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=random`
                    }}
                  />
                ) : (
                  <div
                    className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 cursor-pointer"
                    onClick={() => navigate(`/profile/${post.author.id}`)}
                  >
                    <span className="text-lg text-gray-500">
                      {post.author?.username?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <div>
                  <p
                    className="font-semibold cursor-pointer hover:text-indigo-600"
                    onClick={() => navigate(`/profile/${post.author.id}`)}
                  >
                    {post.author?.username || "Unknown User"}
                  </p>
                  <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</p>
                </div>

                {/* Friend Request Button */}
                {post.author.id !== user?.id && (
                  <div className="ml-auto">
                    <FriendRequestButton
                      userId={post.author.id}
                      initialStatus={friendStatuses[post.author.id] || null}
                      onStatusChange={(status) => handleFriendStatusChange(post.author.id, status)}
                    />
                  </div>
                )}
              </div>
              <p className="text-gray-700 whitespace-pre-line">{post.content}</p>

              <PostActions
                postId={post.id}
                likesCount={postLikes[post.id] || 0}
                commentsCount={postComments[post.id] || 0}
                isLiked={!!userLikes[post.id]}
                onLikeChange={(liked) => handleLikeUpdated(post.id, liked)}
                onCommentAdd={() => setShowComments(showComments === post.id ? null : post.id)}
                canDelete={post.user_id === user?.id}
                onDelete={() => handlePostDeleted(post.id)}
              />

              {showComments === post.id && (
                <CommentsSection
                  postId={post.id}
                  onCommentCountChange={(count) => handleCommentCountUpdated(post.id, count)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}