'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import Image from 'next/image'

interface PlanDetails {
  id: string
  name: string
  price: number
  features: string[]
  billing: 'monthly' | 'annual'
}

const planConfigs = {
  starter: {
    name: 'Starter',
    price: 29.99,
    features: [
      '500 minutes/month',
      '1 AI Assistant',
      'Basic call analytics',
      'Email support',
      'Standard voice options',
      '24/7 availability'
    ]
  },
  pro: {
    name: 'Pro',
    price: 79.99,
    features: [
      '2,000 minutes/month',
      '3 AI Assistants',
      'Advanced analytics & insights',
      'CRM integration',
      'Priority support',
      'Custom voice cloning',
      'Lead capture & routing',
      'Call recording & transcripts'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: 199.99,
    features: [
      'Unlimited minutes',
      'Unlimited assistants',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee (99.9%)',
      'Advanced security',
      'Custom voice training',
      'White-label options'
    ]
  }
}

function CheckoutForm() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [plan, setPlan] = useState<PlanDetails | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createBrowserClient()

  useEffect(() => {
    const planId = searchParams.get('plan') as keyof typeof planConfigs
    const billing = searchParams.get('billing') as 'monthly' | 'annual'

    if (planId && planConfigs[planId]) {
      const planConfig = planConfigs[planId]
      const finalPrice = billing === 'annual' ? planConfig.price * 10 : planConfig.price

      setPlan({
        id: planId,
        name: planConfig.name,
        price: billing === 'annual' ? finalPrice / 12 : finalPrice,
        features: planConfig.features,
        billing: billing || 'monthly'
      })
    } else {
      router.push('/')
    }

    // Check if user is already signed in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()
  }, [searchParams, router, supabase])

  const handlePayment = async () => {
    setLoading(true)
    
    try {
      if (!user) {
        // If not signed in, redirect to signup with plan info
        const signupUrl = `/auth/signup?plan=${plan?.id}&billing=${plan?.billing}&returnTo=/checkout`
        router.push(signupUrl)
        return
      }

      // TODO: Integrate with PayPal or Stripe
      // For now, simulate successful payment
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Redirect to dashboard after successful payment
      router.push('/dashboard?welcome=true')
      
    } catch (error) {
      console.error('Payment error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    )
  }

  const savingsAmount = plan.billing === 'annual' ? (plan.price * 12 * 0.167).toFixed(2) : null

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Header */}
      <nav className="border-b border-border-subtle bg-bg-dark/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Image
                src="/voice-matrix-logo.png"
                alt="Voice Matrix"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="text-h3 font-bold text-text-primary">Voice Matrix</span>
            </div>
            <button 
              onClick={() => router.push('/')}
              className="text-text-secondary hover:text-text-primary"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </nav>

      {/* Checkout Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Complete Your Purchase
          </h1>
          <p className="text-text-secondary">
            Start your AI receptionist journey with a 7-day free trial
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Plan Summary */}
          <div className="card">
            <h2 className="text-2xl font-semibold text-text-primary mb-6">
              Order Summary
            </h2>
            
            <div className="bg-bg-dark/50 rounded-12dp p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-text-primary">
                  {plan.name} Plan
                </h3>
                <span className="px-3 py-1 bg-primary-blue/20 text-primary-blue rounded-full text-sm font-medium">
                  {plan.billing === 'annual' ? 'Annual' : 'Monthly'}
                </span>
              </div>
              
              <div className="flex items-baseline justify-between mb-4">
                <span className="text-2xl font-bold text-text-primary">
                  ${plan.price.toFixed(2)}
                </span>
                <span className="text-text-secondary">
                  /{plan.billing === 'annual' ? 'month (billed annually)' : 'month'}
                </span>
              </div>

              {savingsAmount && (
                <div className="flex items-center justify-between mb-4 p-3 bg-success-green/10 rounded-8dp">
                  <span className="text-success-green text-sm font-medium">
                    Annual savings: ${savingsAmount}
                  </span>
                  <span className="text-success-green text-xs">
                    2 months free!
                  </span>
                </div>
              )}

              <div className="border-t border-border-subtle pt-4">
                <h4 className="text-sm font-medium text-text-primary mb-3">
                  Included features:
                </h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2 text-sm text-text-secondary">
                      <span className="text-success-green">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-primary-blue/10 rounded-8dp p-4 border border-primary-blue/20">
              <div className="flex items-center space-x-2 text-primary-blue">
                <span>🎁</span>
                <span className="font-medium">7-Day Free Trial</span>
              </div>
              <p className="text-sm text-text-secondary mt-1">
                Your trial starts today. You won't be charged until day 8.
              </p>
            </div>
          </div>

          {/* Payment Form */}
          <div className="card">
            <h2 className="text-2xl font-semibold text-text-primary mb-6">
              Payment Details
            </h2>

            {!user && (
              <div className="bg-warning-yellow/10 border border-warning-yellow/20 rounded-8dp p-4 mb-6">
                <div className="flex items-center space-x-2 text-warning-yellow mb-2">
                  <span>ℹ️</span>
                  <span className="font-medium">Sign up required</span>
                </div>
                <p className="text-sm text-text-secondary">
                  You'll be redirected to create your account before completing payment.
                </p>
              </div>
            )}

            <div className="space-y-6">
              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button className="p-4 border-2 border-primary-blue bg-primary-blue/10 rounded-8dp flex items-center justify-center space-x-2">
                    <span>💳</span>
                    <span className="text-primary-blue font-medium">Credit Card</span>
                  </button>
                  <button className="p-4 border border-border-subtle hover:border-primary-blue/50 rounded-8dp flex items-center justify-center space-x-2 transition-colors">
                    <span>🅿️</span>
                    <span className="text-text-secondary">PayPal</span>
                  </button>
                </div>
              </div>

              {/* Mock Payment Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    className="w-full p-3 bg-bg-dark border border-border-subtle rounded-8dp focus:border-primary-blue focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full p-3 bg-bg-dark border border-border-subtle rounded-8dp focus:border-primary-blue focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      CVC
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full p-3 bg-bg-dark border border-border-subtle rounded-8dp focus:border-primary-blue focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  `Start Free Trial - $${plan.price.toFixed(2)}/${plan.billing === 'annual' ? 'month' : 'month'}`
                )}
              </button>

              <p className="text-xs text-text-disabled text-center">
                By clicking "Start Free Trial", you agree to our Terms of Service and Privacy Policy. 
                Your free trial begins immediately and you can cancel anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Trust */}
        <div className="mt-16 pt-8 border-t border-border-subtle">
          <div className="flex flex-wrap items-center justify-center gap-8 text-text-secondary">
            <div className="flex items-center space-x-2">
              <span className="text-success-green">🔒</span>
              <span className="text-sm">256-bit SSL Encryption</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-primary-blue">💳</span>
              <span className="text-sm">PCI DSS Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-warning-yellow">⭐</span>
              <span className="text-sm">30-Day Money Back</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-accent-teal">📞</span>
              <span className="text-sm">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Force dynamic rendering due to useSearchParams
export const dynamic = 'force-dynamic'

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    }>
      <CheckoutForm />
    </Suspense>
  )
}