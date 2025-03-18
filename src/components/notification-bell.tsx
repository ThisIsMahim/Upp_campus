"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { useAuth } from "../contexts/auth-context"
import { supabase } from "../lib/supabase"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { toast } from "../hooks/use-toast"
import { useNavigate } from "react-router-dom"

export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      try {
        setIsLoading(true)

        // First, get the basic notification data
        const { data: notificationsData, error: notificationsError } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (notificationsError) throw notificationsError

        // Process notifications to get sender information
        const processedNotifications = await Promise.all(
          (notificationsData || []).map(async (notification) => {
            let senderInfo = null

            // For friend requests and acceptances, get the sender from friend_requests
            if (notification.type === "friend_request" || notification.type === "friend_accepted") {
              if (notification.reference_type === "friend_request") {
                const { data: requestData, error: requestError } = await supabase
                  .from("friend_requests")
                  .select("sender_id, receiver_id")
                  .eq("id", notification.reference_id)
                  .single()

                if (!requestError && requestData) {
                  // For friend_request, the sender is the sender_id
                  // For friend_accepted, the sender is the receiver_id (who accepted the request)
                  const senderId =
                    notification.type === "friend_request" ? requestData.sender_id : requestData.receiver_id

                  const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("id, username, avatar_url")
                    .eq("id", senderId)
                    .single()

                  if (!profileError) {
                    senderInfo = profileData
                  }
                }
              }
            }
            // For post likes and comments, get the sender from the action
            else if (notification.type === "post_like" || notification.type === "post_comment") {
              if (notification.reference_type === "post") {
                // For post likes, we need to query the likes table
                if (notification.type === "post_like") {
                  const { data: likeData, error: likeError } = await supabase
                    .from("likes")
                    .select("user_id")
                    .eq("likeable_id", notification.reference_id)
                    .eq("likeable_type", "post")
                    .order("created_at", { ascending: false })
                    .limit(1)

                  if (!likeError && likeData && likeData.length > 0) {
                    const { data: profileData, error: profileError } = await supabase
                      .from("profiles")
                      .select("id, username, avatar_url")
                      .eq("id", likeData[0].user_id)
                      .single()

                    if (!profileError) {
                      senderInfo = profileData
                    }
                  }
                }
                // For comments, get the most recent commenter
                else if (notification.type === "post_comment") {
                  const { data: commentData, error: commentError } = await supabase
                    .from("comments")
                    .select("user_id")
                    .eq("post_id", notification.reference_id)
                    .order("created_at", { ascending: false })
                    .limit(1)

                  if (!commentError && commentData && commentData.length > 0) {
                    const { data: profileData, error: profileError } = await supabase
                      .from("profiles")
                      .select("id, username, avatar_url")
                      .eq("id", commentData[0].user_id)
                      .single()

                    if (!profileError) {
                      senderInfo = profileData
                    }
                  }
                }
              }
            }

            return {
              ...notification,
              sender: senderInfo,
            }
          }),
        )

        setNotifications(processedNotifications)
        setUnreadCount(processedNotifications.filter((n) => !n.seen).length || 0)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()

    // Set up real-time subscription
    const subscription = supabase
      .channel(`notifications:user_id=eq.${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ seen: true }).eq("id", notificationId)

      if (error) throw error

      // Update local state
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, seen: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ seen: true })
        .eq("user_id", user?.id)
        .eq("seen", false)

      if (error) throw error

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, seen: true })))
      setUnreadCount(0)

      toast({
        title: "Success",
        description: "All notifications marked as read",
        variant: "success",
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      })
    }
  }

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    await markAsRead(notification.id)

    // Navigate based on notification type and reference_type
    switch (notification.type) {
      case "friend_request":
      case "friend_accepted":
        if (notification.reference_type === "friend_request") {
          // Get the friend request to determine which profile to navigate to
          const { data, error } = await supabase
            .from("friend_requests")
            .select("sender_id, receiver_id")
            .eq("id", notification.reference_id)
            .single()

          if (!error && data) {
            // Navigate to the other user's profile
            const profileId = data.sender_id === user.id ? data.receiver_id : data.sender_id
            navigate(`/profile?id=${profileId}`)
          } else {
            // Fallback to sender's profile if available
            if (notification.sender?.id) {
              navigate(`/profile?id=${notification.sender.id}`)
            } else {
              navigate("/friends")
            }
          }
        } else {
          // Fallback to friends page
          navigate("/friends")
        }
        break
      case "post_like":
      case "post_comment":
        // Navigate to the post
        if (notification.reference_type === "post") {
          navigate(`/post/${notification.reference_id}`)
        } else {
          navigate("/feed")
        }
        break
      default:
        // Default action
        navigate("/feed")
    }
  }

  const renderNotificationContent = (notification: any) => {
    switch (notification.type) {
      case "friend_request":
        return `${notification.sender?.username || "Someone"} sent you a friend request`
      case "friend_accepted":
        return `${notification.sender?.username || "Someone"} accepted your friend request`
      case "post_like":
        return `${notification.sender?.username || "Someone"} liked your post`
      case "post_comment":
        return `${notification.sender?.username || "Someone"} commented on your post`
      default:
        return "You have a new notification"
    }
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No notifications yet</div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex cursor-pointer items-start p-3 ${!notification.seen ? "bg-blue-50" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="mr-3 flex-shrink-0">
                  {notification.sender?.avatar_url ? (
                    <img
                      src={notification.sender.avatar_url || "/placeholder.svg"}
                      alt={notification.sender.username}
                      className="h-8 w-8 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          notification.sender.username || "User",
                        )}&background=random`
                      }}
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                      <span className="text-sm font-medium text-gray-600">
                        {notification.sender?.username?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{renderNotificationContent(notification)}</p>
                  <p className="text-xs text-gray-500">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

