"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/auth-context"
import { supabase } from "../lib/supabase"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { toast } from "../hooks/use-toast"
import { Trash2, Edit2 } from "lucide-react"

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  author?: {
    username: string
    avatar_url: string | null
  }
}

interface CommentsSectionProps {
  postId: string
  onCommentCountChange: (count: number) => void
}

export function CommentsSection({ postId, onCommentCountChange }: CommentsSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")

  useEffect(() => {
    loadComments()
  }, [postId])

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          author:user_id(
            username,
            avatar_url
          )
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true })

      if (error) throw error

      setComments(data || [])
      onCommentCountChange(data?.length || 0)
    } catch (error) {
      console.error("Error loading comments:", error)
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim()) return

    try {
      setIsSubmitting(true)

      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select(`
          *,
          author:user_id(
            username,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      setComments((prev) => [...prev, data])
      setNewComment("")
      onCommentCountChange(comments.length + 1)

      // Get post author to send notification
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single()

      if (!postError && postData && postData.user_id !== user.id) {
        // Create notification for post author
        await supabase.from("notifications").insert({
          user_id: postData.user_id,
          type: "post_comment",
          reference_id: postId,
          reference_type: "post",
        })
      }
      
      toast({
        title: "Success",
        description: "Comment added successfully",
        variant: "success",
      })
    } catch (error) {
      console.error("Error adding comment:", error)
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      const { error } = await supabase.from("comments").update({ content: editContent.trim() }).eq("id", commentId)

      if (error) throw error

      setComments((prev) =>
        prev.map((comment) => (comment.id === commentId ? { ...comment, content: editContent.trim() } : comment)),
      )

      setEditingComment(null)
      setEditContent("")

      toast({
        title: "Success",
        description: "Comment updated successfully",
        variant: "success",
      })
    } catch (error) {
      console.error("Error updating comment:", error)
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId)

      if (error) throw error

      setComments((prev) => prev.filter((comment) => comment.id !== commentId))
      onCommentCountChange(comments.length - 1)

      toast({
        title: "Success",
        description: "Comment deleted successfully",
        variant: "success",
      })
    } catch (error) {
      console.error("Error deleting comment:", error)
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {user && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={2}
            required
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </form>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {comment.author?.avatar_url ? (
                  <img
                    src={comment.author.avatar_url || "/placeholder.svg"}
                    alt={comment.author.username}
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        comment.author?.username || "",
                      )}&background=random`
                    }}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm text-gray-500">
                      {comment.author?.username?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium">{comment.author?.username || "Unknown User"}</p>
                  <p className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</p>
                </div>
              </div>

              {user?.id === comment.user_id && (
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingComment(comment.id)
                      setEditContent(comment.content)
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(comment.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>

            {editingComment === comment.id ? (
              <div className="mt-2 space-y-2">
                <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={2} required />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={() => handleEdit(comment.id)}>
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingComment(null)
                      setEditContent("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-gray-700">{comment.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

