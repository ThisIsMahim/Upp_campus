import { Link } from "react-router-dom"
import { Button } from "../components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <div className="mb-8">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <div className="mt-2 text-2xl font-semibold text-primary">UPP Campus</div>
      </div>
      <h2 className="text-3xl font-semibold">Page Not Found</h2>
      <p className="mt-4 text-gray-600 max-w-md">
        The page you are looking for doesn't exist or has been moved. 
        Please check the URL or navigate back to the homepage.
      </p>
      <div className="mt-8">
        <Button size="lg" className="bg-primary hover:bg-primary/90">
          <Link to="/" className="flex items-center gap-2">
            <span>Return to Homepage</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}

