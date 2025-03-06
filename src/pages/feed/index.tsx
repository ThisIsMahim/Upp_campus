import { useAuth } from "../../contexts/auth-context"

export default function FeedPage() {
  const { user } = useAuth()
  const username = user?.user_metadata?.username || user?.email?.split("@")[0] || "User"

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Feed</h1>
      <div className="space-y-4">
        {/* Placeholder for feed content */}
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">Welcome, {username}!</p>
          <p className="text-gray-500">Your feed will appear here.</p>
        </div>
      </div>
    </div>
  )
}

