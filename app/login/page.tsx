'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// Separate component for search params handling
function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for error messages from callback
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    
    if (errorParam) {
      let errorMessage = 'Authentication failed'
      
      if (errorParam === 'no_code') {
        errorMessage = 'Invalid magic link. Please request a new one.'
      } else if (errorParam === 'exchange_failed') {
        errorMessage = messageParam || 'Magic link expired or invalid. Please request a new one.'
      } else if (errorParam === 'unexpected') {
        errorMessage = 'An unexpected error occurred. Please try again.'
      } else if (messageParam) {
        errorMessage = messageParam
      }
      
      setError(errorMessage)
    }
  }, [searchParams])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setEmailError(null)
      return false
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address')
      return false
    }
    setEmailError(null)
    return true
  }

  const sendMagicLink = async (emailToSend: string) => {
    setLoading(true)
    setError(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOtp({
        email: emailToSend,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
          shouldCreateUser: true, // Auto-create account if doesn't exist
        },
      })

      if (error) throw error

      setEmailSent(true)
      setResendCooldown(60) // 60 second cooldown
    } catch (err: any) {
      let errorMessage = 'Failed to send magic link'
      
      if (err.message?.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.'
      } else if (err.message?.includes('email')) {
        errorMessage = 'Invalid email address. Please check and try again.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setEmailSent(false)

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    await sendMagicLink(email)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    await sendMagicLink(email)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {emailSent ? 'Check your email' : 'Sign in'}
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          {emailSent 
            ? 'We sent a magic link to your email' 
            : 'Enter your email to receive a secure sign-in link'}
        </p>

        {emailSent ? (
          <div className="space-y-4">
            {/* Success Message */}
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-4 rounded-md">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="font-medium mb-1">Magic link sent!</p>
                  <p className="text-green-600">Check your email at <strong>{email}</strong> and click the link to sign in.</p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-medium">What's next?</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Check your inbox (and spam folder)</li>
                <li>Click the "Sign in" link in the email</li>
                <li>You'll be automatically signed in</li>
              </ol>
            </div>

            {/* Resend Options */}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="w-full text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {resendCooldown > 0 
                  ? `Resend link (${resendCooldown}s)` 
                  : 'Resend magic link'}
              </button>
              <button
                onClick={() => {
                  setEmailSent(false)
                  setEmail('')
                  setError(null)
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-900"
              >
                Use a different email
              </button>
            </div>

            {/* Troubleshooting */}
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
              <p className="font-medium mb-1">Didn't receive the email?</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Check your spam/junk folder</li>
                <li>Wait a few minutes and try resending</li>
                <li>Make sure you entered the correct email</li>
              </ul>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (e.target.value) validateEmail(e.target.value)
                }}
                onBlur={() => validateEmail(email)}
                required
                className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  emailError 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300'
                }`}
                placeholder="you@example.com"
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !!emailError}
              className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending magic link...
                </>
              ) : (
                'Send magic link'
              )}
            </button>
          </form>
        )}

        {/* Info Message */}
        {!emailSent && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              No password needed. We'll send you a secure link to sign in.
            </p>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
