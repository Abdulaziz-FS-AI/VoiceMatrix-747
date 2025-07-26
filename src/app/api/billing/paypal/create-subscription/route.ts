import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { createPayPalClient } from '@/lib/paypal'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planType, returnUrl, cancelUrl } = await request.json()

    // Define subscription plans
    const plans = {
      starter: {
        name: "Aura AI Starter",
        description: "Basic AI receptionist service",
        monthlyPrice: 29.99,
        features: ["500 minutes/month", "1 AI Assistant", "Basic Analytics"]
      },
      pro: {
        name: "Aura AI Pro", 
        description: "Professional AI receptionist service",
        monthlyPrice: 79.99,
        features: ["2000 minutes/month", "3 AI Assistants", "Advanced Analytics", "CRM Integration"]
      },
      enterprise: {
        name: "Aura AI Enterprise",
        description: "Enterprise AI receptionist service", 
        monthlyPrice: 199.99,
        features: ["Unlimited minutes", "Unlimited Assistants", "Custom Integration", "Priority Support"]
      }
    }

    const selectedPlan = plans[planType as keyof typeof plans]
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }

    const paypal = createPayPalClient()

    // Create or get existing PayPal plan
    let paypalPlan
    try {
      // In production, you'd store plan IDs in database
      paypalPlan = await paypal.createPlan({
        name: selectedPlan.name,
        description: selectedPlan.description,
        monthlyPrice: selectedPlan.monthlyPrice
      })
    } catch (error) {
      console.error('Failed to create PayPal plan:', error)
      return NextResponse.json({ error: 'Failed to create subscription plan' }, { status: 500 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Create PayPal subscription
    const subscription = await paypal.createSubscription({
      planId: paypalPlan.id,
      subscriberEmail: profile.email,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?payment=success`,
      cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/billing?payment=cancelled`
    })

    // Store subscription info in database
    await supabase
      .from('profiles')
      .update({
        paypal_subscription_id: subscription.id,
        subscription_plan: planType,
        subscription_status: 'pending'
      })
      .eq('id', user.id)

    // Extract approval URL from PayPal response
    const approvalUrl = subscription.links?.find(link => link.rel === 'approve')?.href

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      approvalUrl,
      planDetails: selectedPlan
    })

  } catch (error) {
    console.error('PayPal subscription creation error:', error)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}