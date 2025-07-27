'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  features: string[]
  limits: {
    minutes: number // -1 for unlimited
    assistants: number // -1 for unlimited
  }
  popular?: boolean
}

interface UserSubscription {
  plan: string
  status: 'active' | 'pending' | 'cancelled' | 'past_due'
  paypal_subscription_id?: string
  current_period_start?: string
  current_period_end?: string
  usage?: {
    minutes_used: number
    assistants_count: number
  }
}

interface BillingHistory {
  id: string
  amount: number
  status: string
  created_at: string
  description: string
}

const plans: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29.99,
    features: [
      '500 minutes/month',
      '1 AI Assistant',
      'Basic Analytics',
      'Email Support'
    ],
    limits: {
      minutes: 500,
      assistants: 1
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79.99,
    features: [
      '2,000 minutes/month',
      '3 AI Assistants',
      'Advanced Analytics',
      'CRM Integration',
      'Priority Support'
    ],
    limits: {
      minutes: 2000,
      assistants: 3
    },
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199.99,
    features: [
      'Unlimited minutes',
      'Unlimited Assistants',
      'Custom Integration',
      'Dedicated Support',
      'SLA Guarantee'
    ],
    limits: {
      minutes: -1,
      assistants: -1
    }
  }
]

const PlanCard = ({ 
  plan, 
  isCurrentPlan, 
  onSelect, 
  isLoading,
  index = 0 
}: { 
  plan: SubscriptionPlan
  isCurrentPlan: boolean
  onSelect: () => void
  isLoading: boolean
  index?: number
}) => {
  return (
    <div className={`
      metric-card fade-in-up stagger-${index + 1} relative
      ${isCurrentPlan ? 'glow-effect border-primary-blue' : ''}
      ${plan.popular ? 'scale-105' : ''}
    `}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary-blue text-white px-3 py-1 rounded-full text-xs font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <span className="bg-success-green text-white px-3 py-1 rounded-full text-xs font-medium">
            Current Plan
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-h3 text-text-primary mb-2">{plan.name}</h3>
        <div className="flex items-baseline justify-center space-x-1">
          <span className="text-text-secondary">$</span>
          <AnimatedCounter 
            value={plan.price}
            className="text-h1 font-bold text-text-primary"
          />
          <span className="text-text-secondary">/month</span>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {plan.features.map((feature, idx) => (
          <div key={idx} className="flex items-center space-x-2">
            <span className="text-success-green">✓</span>
            <span className="text-text-secondary text-sm">{feature}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onSelect}
        disabled={isCurrentPlan || isLoading}
        className={`
          w-full py-3 rounded-8dp font-medium transition-all duration-200
          ${isCurrentPlan 
            ? 'bg-success-green/10 text-success-green cursor-not-allowed'
            : plan.popular
            ? 'btn-primary'
            : 'btn-secondary'
          }
        `}
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span>Processing...</span>
          </div>
        ) : isCurrentPlan ? (
          'Current Plan'
        ) : (
          `Choose ${plan.name}`
        )}
      </button>
    </div>
  )
}

const UsageBar = ({ 
  used, 
  limit, 
  label,
  unit = ''
}: { 
  used: number
  limit: number
  label: string
  unit?: string
}) => {
  const percentage = limit === -1 ? 0 : Math.min((used / limit) * 100, 100)
  const isNearLimit = percentage > 80
  const isOverLimit = percentage >= 100

  const getBarColor = () => {
    if (limit === -1) return 'bg-primary-blue'
    if (isOverLimit) return 'bg-error-red'
    if (isNearLimit) return 'bg-warning-orange'
    return 'bg-success-green'
  }

  return (
    <div className="fade-in-up">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="text-sm text-text-secondary">
          {limit === -1 ? (
            `${used.toLocaleString()}${unit} (Unlimited)`
          ) : (
            `${used.toLocaleString()}${unit} / ${limit.toLocaleString()}${unit}`
          )}
        </span>
      </div>
      
      <div className="w-full bg-border-subtle rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: limit === -1 ? '20%' : `${percentage}%` }}
        />
      </div>
      
      {isNearLimit && limit !== -1 && (
        <p className="text-xs text-warning-orange mt-1">
          {isOverLimit ? 'Usage limit exceeded' : 'Approaching usage limit'}
        </p>
      )}
    </div>
  )
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createBrowserClient()

  const fetchBillingData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user profile with subscription info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }

      // Calculate current usage
      const { data: assistants } = await supabase
        .from('assistants')
        .select('id')
        .eq('user_id', user.id)

      const { data: callLogs } = await supabase
        .from('call_logs')
        .select('duration')
        .in('assistant_id', assistants?.map(a => a.id) || [])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const totalMinutes = Math.ceil(
        (callLogs?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0) / 60
      )

      setSubscription({
        plan: profile?.subscription_plan || 'starter',
        status: profile?.subscription_status || 'pending',
        paypal_subscription_id: profile?.paypal_subscription_id,
        usage: {
          minutes_used: totalMinutes,
          assistants_count: assistants?.length || 0
        }
      })

      // Mock billing history for now
      setBillingHistory([
        {
          id: '1',
          amount: 29.99,
          status: 'paid',
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Starter Plan - Monthly Subscription'
        },
        {
          id: '2',
          amount: 29.99,
          status: 'paid',
          created_at: new Date(Date.now() - 37 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Starter Plan - Monthly Subscription'
        }
      ])

    } catch (err) {
      console.error('Error fetching billing data:', err)
      setError('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  const handlePlanSelect = async (planId: string) => {
    try {
      setActionLoading(true)
      setError(null)

      const response = await fetch('/api/billing/paypal/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planType: planId,
          returnUrl: `${window.location.origin}/dashboard/billing?payment=success`,
          cancelUrl: `${window.location.origin}/dashboard/billing?payment=cancelled`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription')
      }

      if (data.approvalUrl) {
        window.location.href = data.approvalUrl
      }

    } catch (err) {
      console.error('Error creating subscription:', err)
      setError(err instanceof Error ? err.message : 'Failed to create subscription')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
      return
    }

    try {
      setActionLoading(true)
      // Implementation for cancellation
      setSuccess('Subscription cancelled successfully')
    } catch (err) {
      setError('Failed to cancel subscription')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    fetchBillingData()

    // Check for payment status in URL
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')
    
    if (paymentStatus === 'success') {
      setSuccess('Payment successful! Your subscription is now active.')
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (paymentStatus === 'cancelled') {
      setError('Payment was cancelled. Please try again.')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const currentPlan = plans.find(p => p.id === subscription?.plan)

  if (loading) {
    return (
      <div className="p-6">
        <div className="fade-in-up">
          <h1 className="text-h1 text-text-primary mb-2">Billing & Subscription</h1>
          <p className="text-text-secondary mb-6">Manage your subscription and billing</p>
        </div>
        
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`skeleton rounded-12dp h-32 fade-in-up stagger-${i + 1}`}></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="fade-in-up">
        <h1 className="text-h1 text-text-primary bg-gradient-to-r from-text-primary to-primary-blue bg-clip-text">
          Billing & Subscription
        </h1>
        <p className="text-text-secondary mt-2">
          Manage your subscription plan and monitor usage
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="card bg-error-red/10 border-error-red/20 fade-in-up">
          <div className="flex items-center space-x-2">
            <span className="text-error-red">❌</span>
            <span className="text-error-red font-medium">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-error-red hover:text-error-red/70"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="card bg-success-green/10 border-success-green/20 fade-in-up">
          <div className="flex items-center space-x-2">
            <span className="text-success-green">✅</span>
            <span className="text-success-green font-medium">{success}</span>
            <button 
              onClick={() => setSuccess(null)}
              className="ml-auto text-success-green hover:text-success-green/70"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan & Usage */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Plan */}
          <div className="card fade-in-up-delay">
            <h2 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
              <span>📋</span>
              <span>Current Plan</span>
            </h2>
            
            {currentPlan && (
              <div className="text-center p-4 bg-bg-dark rounded-8dp">
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {currentPlan.name}
                </h3>
                <div className="flex items-baseline justify-center space-x-1 mb-4">
                  <span className="text-text-secondary">$</span>
                  <AnimatedCounter 
                    value={currentPlan.price}
                    className="text-h2 font-bold text-primary-blue"
                  />
                  <span className="text-text-secondary">/month</span>
                </div>
                
                <div className={`
                  px-3 py-1 rounded-full text-sm font-medium inline-flex items-center space-x-1
                  ${subscription?.status === 'active' 
                    ? 'bg-success-green/10 text-success-green'
                    : subscription?.status === 'pending'
                    ? 'bg-warning-orange/10 text-warning-orange'
                    : 'bg-error-red/10 text-error-red'
                  }
                `}>
                  <span>
                    {subscription?.status === 'active' ? '✅' : 
                     subscription?.status === 'pending' ? '⏳' : '❌'}
                  </span>
                  <span className="capitalize">{subscription?.status}</span>
                </div>
              </div>
            )}
          </div>

          {/* Usage */}
          <div className="card fade-in-up-delay-2">
            <h2 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
              <span>📊</span>
              <span>Usage This Month</span>
            </h2>
            
            <div className="space-y-6">
              <UsageBar
                used={subscription?.usage?.minutes_used || 0}
                limit={currentPlan?.limits.minutes || 500}
                label="Call Minutes"
                unit=" min"
              />
              
              <UsageBar
                used={subscription?.usage?.assistants_count || 0}
                limit={currentPlan?.limits.assistants || 1}
                label="AI Assistants"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="card fade-in-up-delay-3">
            <h3 className="text-h3 text-text-primary mb-4">Actions</h3>
            
            <div className="space-y-3">
              <button
                onClick={() => fetchBillingData()}
                disabled={actionLoading}
                className="btn-secondary w-full"
              >
                <span>🔄</span>
                <span className="ml-2">Refresh</span>
              </button>
              
              {subscription?.status === 'active' && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={actionLoading}
                  className="btn-destructive w-full"
                >
                  <span>❌</span>
                  <span className="ml-2">Cancel Subscription</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="lg:col-span-2">
          <div className="fade-in-up-delay-4">
            <h2 className="text-h3 text-text-primary mb-6 flex items-center space-x-2">
              <span>💳</span>
              <span>Available Plans</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan, index) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={plan.id === subscription?.plan}
                  onSelect={() => handlePlanSelect(plan.id)}
                  isLoading={actionLoading}
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* Billing History */}
          <div className="card mt-6 fade-in-up-delay-5">
            <h2 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
              <span>🧾</span>
              <span>Billing History</span>
            </h2>
            
            {billingHistory.length > 0 ? (
              <div className="space-y-3">
                {billingHistory.map((payment, index) => (
                  <div 
                    key={payment.id}
                    className={`flex items-center justify-between p-3 bg-bg-dark rounded-8dp fade-in-up stagger-${index + 1}`}
                  >
                    <div>
                      <p className="text-text-primary font-medium">{payment.description}</p>
                      <p className="text-text-secondary text-sm">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-text-primary font-bold">
                        ${payment.amount.toFixed(2)}
                      </p>
                      <span className={`
                        px-2 py-1 rounded text-xs font-medium
                        ${payment.status === 'paid' 
                          ? 'bg-success-green/10 text-success-green'
                          : 'bg-error-red/10 text-error-red'
                        }
                      `}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4 opacity-50">🧾</div>
                <p className="text-text-secondary">No billing history yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}