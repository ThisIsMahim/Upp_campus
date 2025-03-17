"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/auth-context"
import { supabase } from "../../lib/supabase"
import { Button } from "../../components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { toast } from "../../hooks/use-toast"

export default function FriendsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("friends")
  const [friends, setFriends] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [sentRequests, setSentRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchFriends = async () => {
      try {
        setIsLoading(true)

        // Fetch friends (accepted requests)
        const { data: friendsData, error: friendsError } = await supabase
          .from("friend_requests")
          .select(`
            *,
            sender:profiles!sender_id(id, username, avatar_url),
            receiver:profiles!receiver_id(id, username, avatar_url)
          `)
          .eq("status", "accepted")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false })

        if (friendsError) throw friendsError

        // Process friends data to get the correct friend info
        const processedFriends =
          friendsData?.map((request) => {
            const isSender = request.sender_id === user.id
            const friend = isSender ? request.receiver : request.sender
            return {
              id: request.id,
              friend_id: friend.id,
              username: friend.username,
              avatar_url: friend.avatar_url,
              since: request.created_at,
            }
          }) || []

        setFriends(processedFriends)

        // Fetch pending friend requests (received)
        const { data: pendingData, error: pendingError } = await supabase
          .from("friend_requests")
          .select(`
            *,
            sender:profiles!sender_id(id, username, avatar_url)
          `)
          .eq("receiver_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })

        if (pendingError) throw pendingError
        setPendingRequests(pendingData || [])

        // Fetch sent friend requests
        const { data: sentData, error: sentError } = await supabase
          .from("friend_requests")
          .select(`
            *,
            receiver:profiles!receiver_id(id, username, avatar_url)
          `)
          .eq("sender_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })

        if (sentError) throw sentError
        setSentRequests(sentData || [])
      } catch (error) {
        console.error("Error fetching friends data:", error)
        toast({
          title: "Error",
          description: "Failed to load friends data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchFriends()

    // Set up real-time subscription for friend requests
    const subscription = supabase
      .channel("friend_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          or: `sender_id=eq.${user.id},receiver_id=eq.${user.id}`,
        },
        () => {
          fetchFriends()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, toast])

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", requestId)
        .eq("receiver_id", user?.id)

      if (error) throw error

      // Update local state
      const acceptedRequest = pendingRequests.find((req) => req.id === requestId)
      if (acceptedRequest) {
        setPendingRequests((prev) => prev.filter((req) => req.id !== requestId))

        // Add to friends list
        const newFriend = {
          id: acceptedRequest.id,
          friend_id: acceptedRequest.sender_id,
          username: acceptedRequest.sender.username,
          avatar_url: acceptedRequest.sender.avatar_url,
          since: new Date().toISOString(),
        }

        setFriends((prev) => [newFriend, ...prev])
      }

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
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", requestId)
        .eq("receiver_id", user?.id)

      if (error) throw error

      // Update local state
      setPendingRequests((prev) => prev.filter((req) => req.id !== requestId))

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
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .delete()
        .eq("id", requestId)
        .eq("sender_id", user?.id)
        .eq("status", "pending")

      if (error) throw error

      // Update local state
      setSentRequests((prev) => prev.filter((req) => req.id !== requestId))

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
    }
  }

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .delete()
        .or(
          `(sender_id.eq.${user?.id}.and.receiver_id.eq.${friendId}),(sender_id.eq.${friendId}.and.receiver_id.eq.${user?.id})`,
        )
        .eq("status", "accepted")

      if (error) throw error

      // Update local state
      setFriends((prev) => prev.filter((friend) => friend.friend_id !== friendId))

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
    }
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p>Please sign in to view your friends.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
          <h2 className="text-2xl font-bold">Loading...</h2>
          <p className="text-gray-500">Fetching your friends</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Friends</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
            <TabsTrigger value="pending">Requests ({pendingRequests.length})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({sentRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            {friends.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <h2 className="text-xl font-semibold">No friends yet</h2>
                <p className="mt-2 text-gray-500">
                  You don't have any friends yet. Start by sending friend requests to other users.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {friends.map((friend) => (
                  <div key={friend.friend_id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {friend.avatar_url ? (
                          <img
                            src={friend.avatar_url || "/placeholder.svg"}
                            alt={friend.username}
                            className="h-10 w-10 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                friend.username || "User",
                              )}&background=random`
                            }}
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                            <span className="text-sm font-medium text-gray-600">
                              {friend.username?.charAt(0).toUpperCase() || "U"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{friend.username}</div>
                        <p className="text-xs text-gray-500">
                          Friends since {new Date(friend.since).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/profile/${friend.friend_id}`)}>
                        View Profile
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRemoveFriend(friend.friend_id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending">
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <h2 className="text-xl font-semibold">No pending requests</h2>
                <p className="mt-2 text-gray-500">You don't have any pending friend requests at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {request.sender?.avatar_url ? (
                          <img
                            src={request.sender.avatar_url || "/placeholder.svg"}
                            alt={request.sender.username}
                            className="h-10 w-10 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                request.sender.username || "User",
                              )}&background=random`
                            }}
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                            <span className="text-sm font-medium text-gray-600">
                              {request.sender?.username?.charAt(0).toUpperCase() || "U"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{request.sender?.username}</div>
                        <p className="text-xs text-gray-500">
                          Sent {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/profile/${request.sender_id}`)}>
                        View Profile
                      </Button>
                      <Button variant="default" size="sm" onClick={() => handleAcceptRequest(request.id)}>
                        Accept
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRejectRequest(request.id)}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent">
            {sentRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <h2 className="text-xl font-semibold">No sent requests</h2>
                <p className="mt-2 text-gray-500">You haven't sent any friend requests that are still pending.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {request.receiver?.avatar_url ? (
                          <img
                            src={request.receiver.avatar_url || "/placeholder.svg"}
                            alt={request.receiver.username}
                            className="h-10 w-10 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                request.receiver.username || "User",
                              )}&background=random`
                            }}
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                            <span className="text-sm font-medium text-gray-600">
                              {request.receiver?.username?.charAt(0).toUpperCase() || "U"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{request.receiver?.username}</div>
                        <p className="text-xs text-gray-500">
                          Sent {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/profile/${request.receiver_id}`)}>
                        View Profile
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleCancelRequest(request.id)}>
                        Cancel Request
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

