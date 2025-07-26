import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

// SIMPLIFIED webhook handler - just the essentials
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createServerComponentClient()

    console.log('PayPal webhook received:', body.event_type)

    // Only handle the most critical events
    switch (body.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        // User successfully subscribed - activate their account
        const subscriptionId = body.resource.id
        
        await supabase
          .from('profiles')
          .update({ subscription_status: 'active' })
          .eq('paypal_subscription_id', subscriptionId)
        
        console.log('✅ Subscription activated:', subscriptionId)
        break

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        // User cancelled - deactivate their account
        const cancelledId = body.resource.id
        
        await supabase
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('paypal_subscription_id', cancelledId)
        
        console.log('❌ Subscription cancelled:', cancelledId)
        break

      default:
        // Log other events but don't process them
        console.log('ℹ️ Unhandled event:', body.event_type)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    // Don't fail - just log the error
    return NextResponse.json({ success: true })
  }
}