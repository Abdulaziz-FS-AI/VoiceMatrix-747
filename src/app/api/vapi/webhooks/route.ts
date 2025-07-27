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
      const now = new Date()
      const callData = {
        assistant_id: assistant.id,
        phone_number: data.customer?.number || 'Unknown',
        vapi_call_id: data.call.id,
        status: 'active', // Call is starting
        duration: 0,
        // Enhanced analytics data
        metadata: {
          timeOfDay: now.getHours(),
          dayOfWeek: now.getDay(),
          startTimestamp: data.timestamp || now.toISOString(),
          customerNumber: data.customer?.number,
          assistantId: data.call.assistantId
        },
        created_at: now.toISOString()
      }

      await supabase
        .from('call_logs')
        .insert(callData)
    }
  } catch (error) {
    console.error('Failed to handle call started:', error)
  }
}

async function handleCallEnded(supabase: any, data: any) {
  try {
    const endReason = data.endedReason || 'unknown'
    const duration = data.call?.duration || 0
    const transcript = data.transcript || data.messages || []
    
    // Enhanced analytics calculation
    const analyticsData = calculateCallAnalytics(data, transcript, duration)
    
    await supabase
      .from('call_logs')
      .update({
        duration,
        transcript: JSON.stringify(transcript),
        summary: data.summary || `Call ended: ${endReason}`,
        status: getCallStatus(endReason),
        lead_captured: analyticsData.leadCaptured,
        // Enhanced analytics fields stored in metadata
        metadata: {
          ...analyticsData,
          endReason,
          endTimestamp: data.timestamp || new Date().toISOString()
        }
      })
      .eq('vapi_call_id', data.call?.id)
  } catch (error) {
    console.error('Failed to handle call ended:', error)
  }
}

function getCallStatus(endReason: string): string {
  const statusMap: Record<string, string> = {
    'customer-ended-call': 'completed',
    'assistant-ended-call': 'completed',
    'call-transferred': 'completed',
    'customer-did-not-give-microphone-permission': 'failed',
    'voicemail': 'failed',
    'assistant-not-responding': 'failed',
    'exceeded-max-duration': 'completed',
    'silence-timeout': 'failed'
  }
  
  return statusMap[endReason] || 'failed'
}

function calculateCallAnalytics(data: any, transcript: any[], duration: number) {
  // Analyze transcript for business intelligence
  const transcriptText = Array.isArray(transcript) 
    ? transcript.map(t => t.text || t.content || '').join(' ').toLowerCase()
    : String(transcript).toLowerCase()
  
  // Lead scoring keywords
  const leadKeywords = ['interested', 'appointment', 'schedule', 'meeting', 'quote', 'price', 'cost', 'buy', 'purchase', 'contact']
  const appointmentKeywords = ['book', 'schedule', 'appointment', 'meeting', 'time', 'date', 'available']
  const qualifiedKeywords = ['budget', 'decision', 'timeline', 'authority', 'need']
  
  const leadScore = leadKeywords.filter(keyword => transcriptText.includes(keyword)).length
  const appointmentScore = appointmentKeywords.filter(keyword => transcriptText.includes(keyword)).length
  const qualificationScore = qualifiedKeywords.filter(keyword => transcriptText.includes(keyword)).length
  
  return {
    leadCaptured: leadScore >= 2 || appointmentScore >= 1,
    appointmentBooked: appointmentScore >= 2,
    salesQualified: qualificationScore >= 2,
    leadScore: Math.min(leadScore * 10, 100),
    sentimentScore: analyzeSentiment(transcriptText),
    keywordsMatched: leadScore + appointmentScore + qualificationScore,
    callQuality: duration > 30 ? 'good' : duration > 10 ? 'fair' : 'poor',
    resolutionType: determineResolutionType(transcriptText, data.endedReason)
  }
}

function analyzeSentiment(text: string): number {
  // Simple sentiment analysis
  const positiveWords = ['happy', 'good', 'great', 'excellent', 'satisfied', 'thank', 'thanks', 'helpful', 'perfect']
  const negativeWords = ['bad', 'terrible', 'awful', 'disappointed', 'frustrated', 'angry', 'unhappy', 'problem']
  
  const positiveCount = positiveWords.filter(word => text.includes(word)).length
  const negativeCount = negativeWords.filter(word => text.includes(word)).length
  
  // Return score from -1 to 1
  const totalWords = positiveCount + negativeCount
  if (totalWords === 0) return 0
  
  return (positiveCount - negativeCount) / totalWords
}

function determineResolutionType(text: string, endReason: string): string {
  if (text.includes('transfer') || endReason === 'call-transferred') return 'transferred'
  if (text.includes('schedule') || text.includes('appointment')) return 'appointment'
  if (text.includes('information') || text.includes('answer')) return 'information'
  if (text.includes('callback') || text.includes('call back')) return 'callback'
  return 'general'
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