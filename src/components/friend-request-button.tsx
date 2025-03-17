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
      const { data, error } = await supabase
        .from("friend_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("sender_id", userId)
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .select()
        .single()

      if (error) throw error

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
      const { error } = await supabase
        .from("friend_requests")
        .delete()
        .or(
          `(sender_id.eq.${user.id}.and.receiver_id.eq.${userId}),(sender_id.eq.${userId}.and.receiver_id.eq.${user.id})`,
        )
        .eq("status", "accepted")

      if (error) throw error

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

