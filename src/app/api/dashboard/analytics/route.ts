import { createServerComponentClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient(cookieStore)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's assistants
    const { data: assistants } = await supabase
      .from('assistants')
      .select('id, name, status, created_at')
      .eq('user_id', user.id)

    if (!assistants || assistants.length === 0) {
      return NextResponse.json({
        assistants: [],
        analytics: {
          callsToday: 0,
          callsThisWeek: 0,
          callsThisMonth: 0,
          totalCalls: 0,
          averageDuration: 0,
          leadsCapured: 0,
          successRate: 0
        }
      })
    }

    const assistantIds = assistants.map(a => a.id)

    // Get today's date boundaries
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const weekStart = new Date(todayStart.getTime() - (7 * 24 * 60 * 60 * 1000))
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    // Get call statistics
    const { data: allCalls } = await supabase
      .from('call_logs')
      .select('id, duration, status, lead_captured, created_at')
      .in('assistant_id', assistantIds)

    const calls = allCalls || []

    // Calculate analytics
    const callsToday = calls.filter(call => 
      new Date(call.created_at) >= todayStart
    ).length

    const callsThisWeek = calls.filter(call => 
      new Date(call.created_at) >= weekStart
    ).length

    const callsThisMonth = calls.filter(call => 
      new Date(call.created_at) >= monthStart
    ).length

    const completedCalls = calls.filter(call => call.status === 'completed')
    const leadsCapured = calls.filter(call => call.lead_captured).length
    
    const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0)
    const averageDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0
    
    const successRate = calls.length > 0 ? 
      Math.round((completedCalls.length / calls.length) * 100) : 0

    // Recent activity
    const recentCalls = calls
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(call => {
        const assistant = assistants.find(a => a.id === call.assistant_id)
        return {
          id: call.id,
          type: 'call' as const,
          description: `Call ${call.status} - ${assistant?.name || 'Unknown Assistant'}`,
          timestamp: call.created_at,
          phoneNumber: call.phone_number || 'Unknown'
        }
      })

    // Assistant activity
    const assistantActivity = assistants.map(assistant => {
      const assistantCalls = calls.filter(call => call.assistant_id === assistant.id)
      return {
        id: assistant.id,
        type: 'system' as const,
        description: `${assistant.name} - ${assistantCalls.length} calls`,
        timestamp: assistant.created_at,
        status: assistant.status
      }
    })

    const recentActivity = [...recentCalls, ...assistantActivity]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    return NextResponse.json({
      assistants: assistants.map(assistant => ({
        id: assistant.id,
        name: assistant.name,
        status: assistant.status,
        callCount: calls.filter(call => call.assistant_id === assistant.id).length,
        created_at: assistant.created_at
      })),
      analytics: {
        callsToday,
        callsThisWeek,
        callsThisMonth,
        totalCalls: calls.length,
        averageDuration,
        leadsCapured,
        successRate
      },
      recentActivity
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}