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
        const { data, error } = await supabase
          .from("notifications")
          .select(`
            *,
            sender:profiles!reference_id(id, username, avatar_url)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (error) throw error

        setNotifications(data || [])
        setUnreadCount(data?.filter((n) => !n.seen).length || 0)
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
          event: "*",
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

    // Navigate based on notification type
    switch (notification.type) {
      case "friend_request":
      case "friend_accepted":
        navigate(`/profile/${notification.sender.id}`)
        break
      case "post_like":
      case "post_comment":
        // Navigate to the post
        if (notification.post?.id) {
          navigate(`/post/${notification.post.id}`)
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

