"use client"

import { useState, useEffect, useCallback } from "react"
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
  const [showComments, setShowComments] = useState<string | null>(null)
  const [postLikes, setPostLikes] = useState<Record<string, number>>({})
  const [postComments, setPostComments] = useState<Record<string, number>>({})
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({})
  const [friendStatuses, setFriendStatuses] = useState<Record<string, string | null>>({})

  // Handle session refresh
  const handleSessionRefresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      return true
    } catch (error) {
      console.error("Error refreshing session:", error)
      navigate("/auth/login")
      return false
    }
  }, [navigate])

  // Load feed data
  const loadFeedData = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setLoadError(null)

      // Load user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError) throw profileError
      setUserProfile(profile)

      if (!profile.campus_id) {
        setIsLoading(false)
        return
      }

      // Load campus data
      const { data: campusData, error: campusError } = await supabase
        .from("campuses")
        .select("*")
        .eq("id", profile.campus_id)
        .single()

      if (campusError) throw campusError
      setCurrentCampus(campusData)

      // Load posts with proper error handling
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

      if (postsError) throw postsError
      setPosts(postsData)

      // Process post interactions
      const likesMap: Record<string, number> = {}
      const commentsMap: Record<string, number> = {}
      const userLikesMap: Record<string, boolean> = {}

      postsData.forEach((post) => {
        likesMap[post.id] = post.likes?.length || 0
        commentsMap[post.id] = post.comments?.length || 0
        userLikesMap[post.id] = post.likes?.some((like: any) => like.user_id === user.id) || false
      })

      setPostLikes(likesMap)
      setPostComments(commentsMap)
      setUserLikes(userLikesMap)

      // Check friend statuses with proper UUID handling
      const friendStatusMap: Record<string, string | null> = {}
      for (const post of postsData) {
        if (post.author.id === user.id) continue

        try {
          const { data: friendData, error: friendError } = await supabase
            .from("friend_requests")
            .select("*")
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${post.author.id}),` +
              `and(sender_id.eq.${post.author.id},receiver_id.eq.${user.id})`
            )
            .limit(1)

          if (friendError) throw friendError
          friendStatusMap[post.author.id] = friendData?.[0]?.status || null
        } catch (error) {
          console.error("Friend status check error:", error)
          if (error instanceof Error && error.message.includes("JWT")) {
            await handleSessionRefresh()
          }
        }
      }

      setFriendStatuses(friendStatusMap)
    } catch (error) {
      console.error("Feed load error:", error)
      setLoadError(error instanceof Error ? error.message : "Unknown error")
      
      if (error instanceof Error && error.message.includes("JWT")) {
        await handleSessionRefresh()
      }
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, handleSessionRefresh])

  useEffect(() => {
    loadFeedData()
  }, [loadFeedData])

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

  // Fixed profile navigation handler
  const handleProfileNavigation = (userId: string) => {
    navigate(`/profile?id=${userId}`)
  }

  // Render post author section
  const renderPostAuthor = (post: any) => (
    <div className="flex items-center mb-4">
      <div
        className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 cursor-pointer"
        onClick={() => handleProfileNavigation(post.author.id)}
      >
        {post.author?.avatar_url ? (
          <img
            src={post.author.avatar_url}
            alt={post.author.username}
            className="h-full w-full rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.username)}&background=random`
            }}
          />
        ) : (
          <span className="text-lg text-gray-500">
            {post.author?.username?.charAt(0).toUpperCase() || "?"}
          </span>
        )}
      </div>
      <div>
        <p
          className="font-semibold cursor-pointer hover:text-indigo-600"
          onClick={() => handleProfileNavigation(post.author.id)}
        >
          {post.author?.username || "Unknown User"}
        </p>
        <p className="text-xs text-gray-500">
          {new Date(post.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading your feed...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto bg-card rounded-xl shadow-card p-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Error Loading Feed</h1>
            <p className="text-gray-600">{loadError}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary-600 text-white transition-colors"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!userProfile?.campus_id) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto bg-card rounded-xl shadow-card p-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">No Campus Selected</h1>
            <p className="text-gray-600">You need to select a campus in your profile to see posts.</p>
            <Button
              onClick={() => navigate("/profile")}
              className="bg-primary hover:bg-primary-600 text-white transition-colors"
            >
              Go to Profile
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const campusName = currentCampus?.name || "Your Campus"

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Feed - {campusName}</h1>

        {/* Create Post Form */}
        {userProfile && currentCampus && (
          <div className="bg-card rounded-xl shadow-card p-6 hover:shadow-card-hover transition-shadow">
            <PostForm
              userProfile={userProfile}
              currentCampus={currentCampus}
              onPostCreated={handlePostCreated}
            />
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="bg-card rounded-xl shadow-card p-8 text-center">
              <p className="text-gray-600">No posts yet. Be the first to post!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-card rounded-xl shadow-card p-6 hover:shadow-card-hover transition-shadow">
                <div className="flex justify-between">
                {renderPostAuthor(post)}

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
    </div>
  )
}