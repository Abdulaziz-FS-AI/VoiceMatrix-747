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

    const { searchParams } = new URL(request.url)
    const assistantId = searchParams.get('assistantId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get user's assistants first to ensure proper access control
    const { data: assistants } = await supabase
      .from('assistants')
      .select('id')
      .eq('user_id', user.id)

    if (!assistants || assistants.length === 0) {
      return NextResponse.json({ callLogs: [], total: 0 })
    }

    const assistantIds = assistants.map(a => a.id)

    // Build query
    let query = supabase
      .from('call_logs')
      .select(`
        id,
        assistant_id,
        phone_number,
        duration,
        status,
        transcript,
        summary,
        lead_captured,
        created_at,
        assistants!inner(name)
      `)
      .in('assistant_id', assistantIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by specific assistant if requested
    if (assistantId && assistantIds.includes(assistantId)) {
      query = query.eq('assistant_id', assistantId)
    }

    const { data: callLogs, error } = await query

    if (error) {
      console.error('Failed to fetch call logs:', error)
      return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 })
    }

    // Get total count
    let countQuery = supabase
      .from('call_logs')
      .select('id', { count: 'exact', head: true })
      .in('assistant_id', assistantIds)

    if (assistantId && assistantIds.includes(assistantId)) {
      countQuery = countQuery.eq('assistant_id', assistantId)
    }

    const { count } = await countQuery

    // Format call logs for frontend
    const formattedLogs = callLogs?.map(log => ({
      id: log.id,
      assistantId: log.assistant_id,
      assistantName: log.assistants?.name || 'Unknown Assistant',
      phoneNumber: log.phone_number,
      duration: log.duration,
      status: log.status,
      transcript: log.transcript ? (typeof log.transcript === 'string' ? log.transcript : JSON.stringify(log.transcript)) : null,
      summary: log.summary,
      leadCaptured: log.lead_captured,
      createdAt: log.created_at
    })) || []

    return NextResponse.json({
      callLogs: formattedLogs,
      total: count || 0,
      hasMore: (offset + limit) < (count || 0)
    })

  } catch (error) {
    console.error('Call logs API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}