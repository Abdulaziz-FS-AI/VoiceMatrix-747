import { createServerComponentClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient(cookieStore)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error in call-logs:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assistantId = searchParams.get('assistantId')
    const status = searchParams.get('status')
    const leadOnly = searchParams.get('leadOnly') === 'true'
    const dateRange = searchParams.get('dateRange') || '7d'
    
    // Handle pagination - frontend sends page, convert to offset
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    console.log('Fetching call logs for user:', user.id)
    
    // Get user's assistants first to ensure proper access control
    const { data: assistants, error: assistantsError } = await supabase
      .from('assistants')
      .select('id')
      .eq('user_id', user.id)

    if (assistantsError) {
      console.error('Error fetching assistants:', assistantsError)
      return NextResponse.json({ error: 'Failed to fetch assistants' }, { status: 500 })
    }

    console.log('User assistants:', assistants)

    if (!assistants || assistants.length === 0) {
      console.log('No assistants found for user')
      return NextResponse.json({ callLogs: [], totalCount: 0 })
    }

    const assistantIds = assistants.map(a => a.id)

    // Calculate date filter
    let dateFilter = null
    if (dateRange) {
      const now = new Date()
      switch (dateRange) {
        case '1d':
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
          break
        case '7d':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
          break
        case '30d':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
          break
        case '90d':
          dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
          break
      }
    }

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
      `, { count: 'exact' })
      .in('assistant_id', assistantIds)
      
    // Apply filters
    if (assistantId && assistantId !== 'all' && assistantIds.includes(assistantId)) {
      query = query.eq('assistant_id', assistantId)
    }
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (leadOnly) {
      query = query.eq('lead_captured', true)
    }
    
    if (dateFilter) {
      query = query.gte('created_at', dateFilter)
    }
    
    // Apply ordering and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: callLogs, error, count } = await query

    if (error) {
      console.error('Failed to fetch call logs:', error)
      return NextResponse.json({ error: 'Failed to fetch call logs', details: error.message }, { status: 500 })
    }

    console.log(`Found ${callLogs?.length || 0} call logs, total count: ${count}`)

    // Format call logs for frontend
    const formattedLogs = callLogs?.map(log => ({
      id: log.id,
      assistantId: log.assistant_id,
      assistantName: (log as any).assistants?.name || 'Unknown Assistant',
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
      totalCount: count || 0,  // Changed from 'total' to 'totalCount' to match frontend
      hasMore: (offset + limit) < (count || 0)
    })

  } catch (error) {
    console.error('Call logs API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}