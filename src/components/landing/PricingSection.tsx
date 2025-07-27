'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PricingTier {
  id: string
  name: string
  price: number
  originalPrice?: number
  description: string
  features: string[]
  isPopular?: boolean
  badge?: string
}

const pricingTiers: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29.99,
    description: 'Perfect for small businesses getting started with AI phone automation',
    features: [
      '500 minutes/month',
      '1 AI Assistant',
      'Basic call analytics',
      'Email support',
      'Standard voice options',
      '24/7 availability'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79.99,
    originalPrice: 99.99,
    description: 'Ideal for growing businesses with higher call volumes',
    features: [
      '2,000 minutes/month',
      '3 AI Assistants',
      'Advanced analytics & insights',
      'CRM integration',
      'Priority support',
      'Custom voice cloning',
      'Lead capture & routing',
      'Call recording & transcripts'
    ],
    isPopular: true,
    badge: 'Most Popular'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199.99,
    description: 'For large organizations requiring unlimited capacity',
    features: [
      'Unlimited minutes',
      'Unlimited assistants',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee (99.9%)',
      'Advanced security',
      'Custom voice training',
      'White-label options'
    ],
    badge: 'Best Value'
  }
]

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)
  const router = useRouter()

  const handleStartPlan = async (planId: string) => {
    // Redirect to payment flow with plan selection
    router.push(`/checkout?plan=${planId}&billing=${isAnnual ? 'annual' : 'monthly'}`)
  }

  const getDisplayPrice = (price: number) => {
    if (isAnnual) {
      const annualPrice = price * 10 // 2 months free on annual
      return {
        monthly: (annualPrice / 12).toFixed(2),
        savings: `Save $${(price * 2).toFixed(2)}`
      }
    }
    return { monthly: price.toFixed(2), savings: null }
  }

  return (
    <section id="pricing" className="py-32dp px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-bg-dark to-bg-surface">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 fade-in-up">
          <span className="text-label text-primary-blue mb-4 block font-semibold tracking-wider">
            SIMPLE PRICING
          </span>
          <h2 className="text-5xl font-bold text-text-primary mb-6">
            Choose Your Perfect Plan
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-8">
            Start with a 7-day free trial. No setup fees, no contracts. Cancel anytime.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-12">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-text-primary' : 'text-text-secondary'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                isAnnual ? 'bg-primary-blue' : 'bg-border-subtle'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  isAnnual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? 'text-text-primary' : 'text-text-secondary'}`}>
              Annual
            </span>
            {isAnnual && (
              <span className="ml-2 px-2 py-1 bg-success-green/10 text-success-green text-xs font-medium rounded-full">
                Save 2 months!
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {pricingTiers.map((tier, index) => {
            const pricing = getDisplayPrice(tier.price)
            return (
              <div
                key={tier.id}
                className={`relative card hover-lift transition-all duration-300 ${
                  tier.isPopular
                    ? 'border-primary-blue ring-2 ring-primary-blue/20 scale-105'
                    : 'hover:border-primary-blue/50'
                } fade-in-up stagger-${index + 1}`}
              >
                {/* Badge */}
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className={`px-4 py-1 rounded-full text-xs font-medium text-white ${
                      tier.isPopular ? 'bg-primary-blue' : 'bg-success-green'
                    }`}>
                      {tier.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-text-primary mb-2">
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline justify-center mb-4">
                    <span className="text-4xl font-bold text-text-primary">
                      ${pricing.monthly}
                    </span>
                    <span className="text-text-secondary ml-1">/month</span>
                    {tier.originalPrice && !isAnnual && (
                      <span className="text-text-disabled line-through ml-2">
                        ${tier.originalPrice}
                      </span>
                    )}
                  </div>
                  {pricing.savings && (
                    <p className="text-success-green text-sm font-medium mb-2">
                      {pricing.savings}
                    </p>
                  )}
                  <p className="text-text-secondary text-sm">
                    {tier.description}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center space-x-3">
                      <span className="text-success-green">✓</span>
                      <span className="text-text-secondary text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleStartPlan(tier.id)}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                    tier.isPopular
                      ? 'bg-primary-blue text-white hover:bg-blue-600 hover:scale-105'
                      : 'bg-bg-dark text-text-primary border border-border-subtle hover:border-primary-blue hover:text-primary-blue'
                  }`}
                >
                  Start Free Trial
                </button>
                
                <p className="text-xs text-text-disabled text-center mt-3">
                  7-day free trial • No credit card required
                </p>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center fade-in-up-delay">
          <p className="text-text-secondary mb-6">
            Need a custom solution? We've got you covered.
          </p>
          <button className="btn-secondary">
            Contact Sales
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 pt-16 border-t border-border-subtle">
          <div className="flex flex-wrap items-center justify-center gap-8 text-text-secondary">
            <div className="flex items-center space-x-2">
              <span className="text-success-green">🔒</span>
              <span className="text-sm">SOC2 Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-warning-yellow">⭐</span>
              <span className="text-sm">99.9% Uptime SLA</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-primary-blue">💳</span>
              <span className="text-sm">Secure Payments</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-accent-teal">📞</span>
              <span className="text-sm">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}