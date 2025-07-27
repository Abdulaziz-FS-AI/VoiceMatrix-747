import { createServerComponentClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient(cookieStore)
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pairs } = await request.json()
    const { id: assistantId } = await params

    // Verify the assistant belongs to the user
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('id, user_id')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })
    }

    // Insert Q&A pairs
    const qaPairsToInsert = pairs.map((pair: any) => ({
      assistant_id: assistantId,
      question: pair.question,
      answer: pair.answer,
      priority: pair.priority || 1
    }))

    const { data: qaPairs, error } = await supabase
      .from('qa_pairs')
      .insert(qaPairsToInsert)
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create Q&A pairs' }, { status: 500 })
    }

    return NextResponse.json({ qaPairs })
  } catch (error) {
    console.error('Q&A pairs creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}