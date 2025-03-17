import { Link } from "react-router-dom"
import { Button } from "../components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <h2 className="mt-4 text-2xl font-semibold">Page Not Found</h2>
      <p className="mt-2 text-gray-600">The page you are looking for doesn't exist or has been moved.</p>
      <div className="mt-8">
        <Button>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    </div>
  )
}

