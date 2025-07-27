import { createServerComponentClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient(cookieStore)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's first assistant
    const { data: assistants } = await supabase
      .from('assistants')
      .select('id, name')
      .eq('user_id', user.id)
      .limit(1)

    if (!assistants || assistants.length === 0) {
      return NextResponse.json({ error: 'No assistants found. Create an assistant first.' }, { status: 400 })
    }

    const assistant = assistants[0]

    // Create multiple test call logs
    const testCalls = [
      {
        assistant_id: assistant.id,
        phone_number: '+1234567890',
        duration: 120,
        status: 'completed',
        transcript: 'Customer: Hello, I\'m interested in your services.\nAssistant: Thank you for calling! I\'d be happy to help you learn about our services.',
        summary: 'Customer inquiry about services - lead captured',
        lead_captured: true,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      },
      {
        assistant_id: assistant.id,
        phone_number: '+0987654321',
        duration: 45,
        status: 'completed',
        transcript: 'Customer: What are your operating hours?\nAssistant: We are open Monday through Friday, 9 AM to 6 PM.',
        summary: 'Quick question about operating hours',
        lead_captured: false,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
      },
      {
        assistant_id: assistant.id,
        phone_number: '+1555123456',
        duration: 0,
        status: 'failed',
        transcript: null,
        summary: 'Call failed to connect',
        lead_captured: false,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        assistant_id: assistant.id,
        phone_number: '+1777888999',
        duration: 180,
        status: 'completed',
        transcript: 'Customer: I need pricing information for your premium plan.\nAssistant: I\'ll be happy to provide that information. Let me get those details for you.',
        summary: 'Pricing inquiry for premium plan - high value lead',
        lead_captured: true,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
      }
    ]

    const { data, error } = await supabase
      .from('call_logs')
      .insert(testCalls)
      .select()

    if (error) {
      console.error('Failed to create test calls:', error)
      return NextResponse.json({ error: 'Failed to create test calls', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Created ${data.length} test call logs for assistant "${assistant.name}"`,
      calls: data
    })

  } catch (error) {
    console.error('Test call logs API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}