import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await request.json()
    const assistantId = params.id

    // Validate content length (100KB limit)
    if (!content || content.length > 100000) {
      return NextResponse.json(
        { error: 'Content is required and must be under 100KB' },
        { status: 400 }
      )
    }

    // Verify user owns this assistant
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select(`
        id,
        businesses!inner(
          user_id
        )
      `)
      .eq('id', assistantId)
      .eq('businesses.user_id', user.id)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })
    }

    // Update knowledge base
    const { error: upsertError } = await supabase
      .from('knowledge_bases')
      .upsert({
        assistant_id: assistantId,
        content,
        processed_at: null // Mark as unprocessed
      })

    if (upsertError) {
      console.error('Failed to update knowledge base:', upsertError)
      return NextResponse.json(
        { error: 'Failed to update knowledge base' }, 
        { status: 500 }
      )
    }

    // Trigger background processing (we'll implement this as an edge function)
    try {
      await fetch(`${process.env.SUPABASE_URL}/functions/v1/process-knowledge-base`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assistantId, content })
      })
    } catch (processingError) {
      console.error('Failed to trigger knowledge base processing:', processingError)
      // Don't fail the request, processing can happen later
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Knowledge base is being processed. This may take a few minutes.' 
    })

  } catch (error) {
    console.error('Knowledge base update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assistantId = params.id

    // Get knowledge base for this assistant
    const { data: knowledgeBase, error } = await supabase
      .from('knowledge_bases')
      .select(`
        *,
        assistants!inner(
          id,
          businesses!inner(
            user_id
          )
        )
      `)
      .eq('assistant_id', assistantId)
      .eq('assistants.businesses.user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No knowledge base found
        return NextResponse.json({ knowledgeBase: null })
      }
      console.error('Failed to fetch knowledge base:', error)
      return NextResponse.json(
        { error: 'Failed to fetch knowledge base' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ knowledgeBase })

  } catch (error) {
    console.error('Get knowledge base error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}