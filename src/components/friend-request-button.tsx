"use client"

import { useState } from "react"
import { useAuth } from "../contexts/auth-context"
import { supabase } from "../lib/supabase"
import { Button } from "./ui/button"
import { toast } from "../hooks/use-toast"

interface FriendRequestButtonProps {
  userId: string
  initialStatus?: string | null
  onStatusChange?: (newStatus: string | null) => void
}

export default function FriendRequestButton({ userId, initialStatus, onStatusChange }: FriendRequestButtonProps) {
  const { user } = useAuth()
  const [status, setStatus] = useState<string | null>(initialStatus || null)
  const [isLoading, setIsLoading] = useState(false)

  if (!user || user.id === userId) return null

  const handleSendRequest = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // First, insert the friend request
      const { data, error } = await supabase
        .from("friend_requests")
        .insert({
          sender_id: user.id,
          receiver_id: userId,
          status: "pending",
        })
        .select()
        .single()

      if (error) throw error

      // Then, manually create the notification
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: userId,
        type: "friend_request",
        reference_id: data.id,
        reference_type: "friend_request",
      })

      // Even if notification creation fails, we still consider the friend request sent
      if (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }

      setStatus("pending")
      if (onStatusChange) onStatusChange("pending")

      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent successfully.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error sending friend request:", error)
      toast({
        title: "Error",
        description: "Failed to send friend request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptRequest = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // Get the friend request ID first
      const { data: requestData, error: requestError } = await supabase
        .from("friend_requests")
        .select("id")
        .eq("sender_id", userId)
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .single()

      if (requestError) throw requestError

      // Update the friend request status
      const { data, error } = await supabase
        .from("friend_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", requestData.id)
        .select()
        .single()

      if (error) throw error

      // Manually create the notification
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: userId,
        type: "friend_accepted",
        reference_id: data.id,
        reference_type: "friend_request",
      })

      // Even if notification creation fails, we still consider the request accepted
      if (notificationError) {
        console.warn("Failed to create notification:", notificationError)
      }

      setStatus("accepted")
      if (onStatusChange) onStatusChange("accepted")

      toast({
        title: "Friend Request Accepted",
        description: "You are now friends!",
        variant: "success",
      })
    } catch (error) {
      console.error("Error accepting friend request:", error)
      toast({
        title: "Error",
        description: "Failed to accept friend request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectRequest = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("friend_requests")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("sender_id", userId)
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .select()
        .single()

      if (error) throw error

      setStatus("rejected")
      if (onStatusChange) onStatusChange("rejected")

      toast({
        title: "Friend Request Rejected",
        description: "The friend request has been rejected.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error rejecting friend request:", error)
      toast({
        title: "Error",
        description: "Failed to reject friend request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("friend_requests")
        .delete()
        .eq("sender_id", user.id)
        .eq("receiver_id", userId)
        .eq("status", "pending")

      if (error) throw error

      setStatus(null)
      if (onStatusChange) onStatusChange(null)

      toast({
        title: "Request Cancelled",
        description: "Your friend request has been cancelled.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error cancelling friend request:", error)
      toast({
        title: "Error",
        description: "Failed to cancel friend request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFriend = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // First try to delete where user is sender
      const { error: error1 } = await supabase
        .from("friend_requests")
        .delete()
        .eq("sender_id", user.id)
        .eq("receiver_id", userId)
        .eq("status", "accepted")

      // Then try to delete where user is receiver
      const { error: error2 } = await supabase
        .from("friend_requests")
        .delete()
        .eq("sender_id", userId)
        .eq("receiver_id", user.id)
        .eq("status", "accepted")

      if (error1 && error2) {
        // If both failed, throw the first error
        throw error1
      }

      setStatus(null)
      if (onStatusChange) onStatusChange(null)

      toast({
        title: "Friend Removed",
        description: "This person has been removed from your friends.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error removing friend:", error)
      toast({
        title: "Error",
        description: "Failed to remove friend. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Render different buttons based on the current status
  if (status === "pending") {
    // If the current user sent the request
    if (user.id !== userId) {
      return (
        <Button variant="outline" disabled={isLoading} onClick={handleCancelRequest}>
          {isLoading ? "Processing..." : "Cancel Request"}
        </Button>
      )
    }
    // If the current user received the request
    return (
      <div className="flex space-x-2">
        <Button variant="default" disabled={isLoading} onClick={handleAcceptRequest}>
          {isLoading ? "Processing..." : "Accept"}
        </Button>
        <Button variant="outline" disabled={isLoading} onClick={handleRejectRequest}>
          {isLoading ? "Processing..." : "Reject"}
        </Button>
      </div>
    )
  }

  if (status === "accepted") {
    return (
      <Button variant="outline" disabled={isLoading} onClick={handleRemoveFriend}>
        {isLoading ? "Processing..." : "Remove Friend"}
      </Button>
    )
  }

  // Default: No relationship yet
  return (
    <Button variant="default" disabled={isLoading} onClick={handleSendRequest}>
      {isLoading ? "Processing..." : "Add Friend"}
    </Button>
  )
}

