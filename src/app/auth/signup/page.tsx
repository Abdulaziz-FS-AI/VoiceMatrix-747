'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@/lib/supabase'

function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1: Form, 2: Email confirmation
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createBrowserClient()

  // Get plan info from URL params
  const planId = searchParams.get('plan')
  const billing = searchParams.get('billing')
  const returnTo = searchParams.get('returnTo')

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // If coming from checkout flow, redirect back to checkout
        if (returnTo) {
          router.push(`${returnTo}?plan=${planId}&billing=${billing}`)
        } else {
          router.push('/dashboard')
        }
      }
    }
    checkAuth()
  }, [supabase, router])

  const validateForm = () => {
    if (!email.trim() || !password || !confirmPassword) {
      setError('All fields are required')
      return false
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address')
      return false
    }
    
    return true
  }

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError('')

    console.log('🔐 Starting signup process...')

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: returnTo 
            ? `${window.location.origin}/auth/callback?redirect=${returnTo}&plan=${planId}&billing=${billing}`
            : `${window.location.origin}/auth/callback?redirect=/dashboard`,
        },
      })

      if (error) {
        console.error('❌ Signup error:', error)
        setError(error.message)
        return
      }

      if (data.user) {
        console.log('✅ User created successfully:', data.user.email)
        
        if (data.user.email_confirmed_at) {
          // Email already confirmed (might be duplicate signup)
          if (returnTo) {
            window.location.href = `${returnTo}?plan=${planId}&billing=${billing}`
          } else {
            window.location.href = '/dashboard'
          }
        } else {
          // Show email confirmation step
          setStep(2)
        }
      }
    } catch (err) {
      console.error('❌ Unexpected signup error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    setError('')

    console.log('🔐 Starting Google OAuth signup...')

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: returnTo 
            ? `${window.location.origin}/auth/callback?redirect=${returnTo}&plan=${planId}&billing=${billing}`
            : `${window.location.origin}/auth/callback?redirect=/dashboard`,
        },
      })

      console.log('📝 OAuth response:', { data, error })

      if (error) {
        console.error('❌ OAuth error:', error)
        setError(error.message)
        setLoading(false)
      }
      // If successful, user will be redirected by OAuth flow
    } catch (err) {
      console.error('❌ Unexpected OAuth error:', err)
      setError('Google sign-up failed. Please try again.')
      setLoading(false)
    }
  }

  // Email confirmation step
  if (step === 2) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-success-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-success-green text-2xl">✓</span>
            </div>
            <h1 className="text-h2 text-text-primary mb-4">Check your email!</h1>
            <p className="text-text-secondary">
              We've sent a confirmation link to{' '}
              <span className="text-text-primary font-medium">{email}</span>
            </p>
          </div>

          <div className="bg-bg-surface border border-border-subtle rounded-12dp p-6 mb-8">
            <h3 className="text-text-primary font-semibold mb-4">Next steps:</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-start space-x-3">
                <span className="text-primary-blue mt-1">1.</span>
                <span className="text-text-secondary">Click the confirmation link in your email</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-primary-blue mt-1">2.</span>
                <span className="text-text-secondary">Access your dashboard</span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-primary-blue mt-1">3.</span>
                <span className="text-text-secondary">Create your first AI receptionist</span>
              </div>
            </div>
          </div>

          <p className="text-text-disabled text-sm">
            Didn't receive the email?{' '}
            <button
              onClick={() => handleSignUp()}
              className="text-primary-blue hover:text-indigo-light micro-transition"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Resend confirmation'}
            </button>
          </p>

          <div className="mt-6">
            <Link
              href="/auth/signin"
              className="text-text-secondary hover:text-text-primary micro-transition"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-dark flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-blue to-accent-teal items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <Image
              src="/voice-matrix-logo.png"
              alt="Voice Matrix"
              width={80}
              height={80}
              className="mx-auto mb-6 rounded-full"
            />
            <h1 className="text-4xl font-bold text-white mb-4">
              Start Your AI Receptionist Journey
            </h1>
            <p className="text-xl text-white/90">
              Join thousands of businesses that never miss a call with Voice Matrix AI.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-12dp p-6">
            <div className="text-white/80 mb-4">
              <div className="text-2xl font-bold text-white">10,000+</div>
              <div className="text-sm">Businesses Trust Us</div>
            </div>
            <div className="text-white/80 mb-4">
              <div className="text-2xl font-bold text-white">99.9%</div>
              <div className="text-sm">Uptime Guarantee</div>
            </div>
            <div className="text-white/80">
              <div className="text-2xl font-bold text-white">&lt;2min</div>
              <div className="text-sm">Setup Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="lg:hidden mb-6">
              <Image
                src="/voice-matrix-logo.png"
                alt="Voice Matrix"
                width={60}
                height={60}
                className="mx-auto rounded-full"
              />
            </div>
            
            <h2 className="text-h2 text-text-primary mb-2">
              {planId ? 'Complete Your Purchase' : 'Create your account'}
            </h2>
            <p className="text-text-secondary">
              {planId ? (
                <>Create an account to continue with your {planId} plan</>
              ) : (
                <>Already have an account?{' '}
                  <Link href="/auth/signin" className="text-primary-blue hover:text-indigo-light micro-transition">
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </div>

          {planId && (
            <div className="bg-primary-blue/10 border border-primary-blue/20 rounded-8dp p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-blue font-medium capitalize">{planId} Plan</p>
                  <p className="text-text-secondary text-sm">{billing === 'annual' ? 'Annual billing' : 'Monthly billing'}</p>
                </div>
                <span className="text-primary-blue text-sm">7-day free trial</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-error-red/10 border border-error-red/20 rounded-8dp p-4 mb-6">
              <p className="text-error-red text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input w-full"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input w-full"
                placeholder="Create a password"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="input w-full"
                placeholder="Confirm your password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating account...
                </div>
              ) : (
                planId ? 'Create Account & Continue' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-subtle" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-bg-dark text-text-secondary">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleSignUp}
                disabled={loading}
                className="btn-secondary w-full"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {loading ? 'Connecting...' : 'Continue with Google'}
              </button>
            </div>
          </div>

          <p className="text-xs text-text-disabled mt-6 text-center">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-primary-blue hover:text-indigo-light">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary-blue hover:text-indigo-light">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}

// Force dynamic rendering to ensure fresh environment variables
export const dynamic = 'force-dynamic'