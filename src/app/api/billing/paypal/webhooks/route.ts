import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { PayPalClient } from '@/lib/paypal'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headers = Object.fromEntries(request.headers.entries())

    // Verify webhook signature
    const isValid = PayPalClient.verifyWebhookSignature(
      headers,
      body,
      process.env.PAYPAL_WEBHOOK_ID!
    )

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const supabase = createServerComponentClient()

    console.log('PayPal webhook received:', event.event_type)

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(supabase, event)
        break
      
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(supabase, event)
        break
      
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(supabase, event)
        break
      
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await handlePaymentFailed(supabase, event)
        break
      
      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(supabase, event)
        break

      default:
        console.log('Unhandled PayPal webhook event:', event.event_type)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('PayPal webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleSubscriptionActivated(supabase: any, event: any) {
  const subscriptionId = event.resource.id
  const subscriberEmail = event.resource.subscriber.email_address

  await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      subscription_activated_at: new Date().toISOString()
    })
    .eq('paypal_subscription_id', subscriptionId)

  console.log('Subscription activated:', subscriptionId)
}

async function handleSubscriptionCancelled(supabase: any, event: any) {
  const subscriptionId = event.resource.id

  await supabase
    .from('profiles')
    .update({
      subscription_status: 'cancelled',
      subscription_cancelled_at: new Date().toISOString()
    })
    .eq('paypal_subscription_id', subscriptionId)

  console.log('Subscription cancelled:', subscriptionId)
}

async function handleSubscriptionSuspended(supabase: any, event: any) {
  const subscriptionId = event.resource.id

  await supabase
    .from('profiles')
    .update({
      subscription_status: 'suspended'
    })
    .eq('paypal_subscription_id', subscriptionId)

  console.log('Subscription suspended:', subscriptionId)
}

async function handlePaymentFailed(supabase: any, event: any) {
  const subscriptionId = event.resource.id

  await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due'
    })
    .eq('paypal_subscription_id', subscriptionId)

  console.log('Payment failed for subscription:', subscriptionId)
}

async function handlePaymentCompleted(supabase: any, event: any) {
  const subscriptionId = event.resource.billing_agreement_id

  // Log successful payment
  await supabase
    .from('payment_logs')
    .insert({
      subscription_id: subscriptionId,
      amount: event.resource.amount.total,
      currency: event.resource.amount.currency,
      status: 'completed',
      payment_date: new Date().toISOString(),
      paypal_payment_id: event.resource.id
    })

  console.log('Payment completed for subscription:', subscriptionId)
}