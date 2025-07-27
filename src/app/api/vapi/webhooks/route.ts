import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { VapiClient } from '@/lib/vapi'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signature = request.headers.get('x-vapi-signature')
    
    // Verify webhook signature
    const payload = JSON.stringify(body)
    if (!VapiClient.verifyWebhookSignature(
      payload, 
      signature || '', 
      process.env.VAPI_WEBHOOK_SECRET!
    )) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const supabase = createServerComponentClient()

    switch (body.type) {
      case 'call-started':
        await handleCallStarted(supabase, body.data)
        break
      
      case 'call-ended':
        await handleCallEnded(supabase, body.data)
        break
      
      case 'transcript':
        await handleTranscript(supabase, body.data)
        break

      default:
        console.log('Unknown webhook event type:', body.type)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}

async function handleCallStarted(supabase: any, data: any) {
  try {
    // Find assistant by Vapi assistant ID
    const { data: assistant } = await supabase
      .from('assistants')
      .select('id')
      .eq('vapi_assistant_id', data.call.assistantId)
      .single()

    if (assistant) {
      await supabase
        .from('call_logs')
        .insert({
          assistant_id: assistant.id,
          phone_number: data.customer?.number || 'Unknown',
          vapi_call_id: data.call.id,
          status: 'completed', // Using available status from simplified schema
          created_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Failed to handle call started:', error)
  }
}

async function handleCallEnded(supabase: any, data: any) {
  try {
    await supabase
      .from('call_logs')
      .update({
        duration: data.call?.duration || 0,
        transcript: JSON.stringify(data.transcript || data.messages || []),
        summary: data.summary || `Call ended: ${data.endedReason || 'unknown'}`,
        status: data.endedReason === 'customer-ended-call' ? 'completed' : 'failed',
        lead_captured: false // Default value
      })
      .eq('vapi_call_id', data.call?.id)
  } catch (error) {
    console.error('Failed to handle call ended:', error)
  }
}

async function handleTranscript(supabase: any, data: any) {
  try {
    // Update transcript in real-time
    await supabase
      .from('call_logs')
      .update({
        transcript: JSON.stringify(data.transcript || data.messages || [])
      })
      .eq('vapi_call_id', data.call?.id)
  } catch (error) {
    console.error('Failed to handle transcript update:', error)
  }
}