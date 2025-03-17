"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { ThumbsUp, MessageCircle, Trash2 } from "lucide-react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../contexts/auth-context"
import { toast } from "../hooks/use-toast"

interface PostActionsProps {
  postId: string
  likesCount: number
  commentsCount: number
  isLiked: boolean
  onLikeChange: (liked: boolean) => void
  onCommentAdd: () => void
  canDelete?: boolean
  onDelete?: () => void
}

export function PostActions({
  postId,
  likesCount,
  commentsCount,
  isLiked,
  onLikeChange,
  onCommentAdd,
  canDelete,
  onDelete,
}: PostActionsProps) {
  const { user } = useAuth()
  const [isLiking, setIsLiking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleLike = async () => {
    if (!user) return

    try {
      setIsLiking(true)

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from("likes")
          .delete()
          .match({ user_id: user.id, likeable_id: postId, likeable_type: "post" })

        if (error) throw error

        onLikeChange(false)
      } else {
        // Like
        const { error } = await supabase.from("likes").insert({
          user_id: user.id,
          likeable_id: postId,
          likeable_type: "post",
        })

        if (error) throw error

        onLikeChange(true)
       // Get post author to send notification
        const { data: postData, error: postError } = await supabase
          .from("posts")
          .select("user_id")
          .eq("id", postId)
          .single()

        if (!postError && postData && postData.user_id !== user.id) {
          // Create notification for post author
          await supabase.rpc("send_notification", {
            p_user_id: postData.user_id,
            p_type: "post_like",
            p_reference_id: postId,
          })
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error)
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      })
    } finally {
      setIsLiking(false)
    }
  }

  const handleDelete = async () => {
    if (!canDelete || !onDelete) return

    try {
      setIsDeleting(true)

      const { error } = await supabase.from("posts").delete().match({ id: postId })

      if (error) throw error

      onDelete()
      toast({
        title: "Success",
        description: "Post deleted successfully",
        variant: "success",
      })
    } catch (error) {
      console.error("Error deleting post:", error)
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center space-x-4 mt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLike}
        disabled={isLiking || !user}
        className={`flex items-center space-x-2 ${isLiked ? "text-primary" : ""}`}
      >
        <ThumbsUp className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
        <span>{likesCount}</span>
      </Button>

      <Button variant="ghost" size="sm" onClick={onCommentAdd} disabled={!user} className="flex items-center space-x-2">
        <MessageCircle className="h-4 w-4" />
        <span>{commentsCount}</span>
      </Button>

      {canDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center space-x-2 text-red-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </Button>
      )}
    </div>
  )
}

