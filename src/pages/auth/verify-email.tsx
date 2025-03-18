import React from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../../components/ui/button"

export default function VerifyEmail() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Check Your Email</h2>
          <p className="mt-2 text-gray-600">
            We've sent you a verification link to your email address. Please check your inbox and click the verification link to complete your registration.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            You won't be able to post or use features until your email is verified.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Button
            onClick={() => navigate("/auth/login")}
            className="w-full"
          >
            Return to Login
          </Button>
          <Button
            onClick={() => navigate("/auth/signup")}
            variant="outline"
            className="w-full"
          >
            Try a Different Email
          </Button>
        </div>
      </div>
    </div>
  )
} 