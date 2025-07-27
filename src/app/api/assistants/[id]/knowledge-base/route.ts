import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
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

    // Verify user owns this assistant (simplified schema)
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('id, user_id')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })
    }

    // Process and store knowledge base content
    if (content && content.trim()) {
      // Split content into manageable chunks
      const chunks = splitIntoChunks(content, 1000)
      
      // Clear existing knowledge base for this assistant
      await supabase
        .from('knowledge_base')
        .delete()
        .eq('assistant_id', assistantId)

      // Store each chunk
      const knowledgeEntries = chunks.map(chunk => ({
        assistant_id: assistantId,
        content: chunk,
        created_at: new Date().toISOString()
      }))

      const { error: insertError } = await supabase
        .from('knowledge_base')
        .insert(knowledgeEntries)

      if (insertError) {
        console.error('Failed to insert knowledge base:', insertError)
        return NextResponse.json({ error: 'Failed to process knowledge base' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      chunksProcessed: content ? splitIntoChunks(content, 1000).length : 0
    })

  } catch (error) {
    console.error('Knowledge base processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const supabase = createServerComponentClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assistantId = params.id

    // Verify user owns this assistant
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('id, user_id')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })
    }

    // Get knowledge base for this assistant
    const { data: knowledgeBase, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('assistant_id', assistantId)

    if (error) {
      console.error('Failed to fetch knowledge base:', error)
      return NextResponse.json(
        { error: 'Failed to fetch knowledge base' }, 
        { status: 500 }
      )
    }

    // Combine all chunks into one content
    const combinedContent = knowledgeBase?.map(chunk => chunk.content).join('\n\n') || ''

    return NextResponse.json({ 
      knowledgeBase: {
        content: combinedContent,
        chunks: knowledgeBase?.length || 0,
        created_at: knowledgeBase?.[0]?.created_at
      }
    })

  } catch (error) {
    console.error('Get knowledge base error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (currentChunk.length + trimmedSentence.length > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = trimmedSentence
      } else {
        // Handle very long sentences
        chunks.push(trimmedSentence.substring(0, chunkSize))
      }
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.length > 0 ? chunks : [text.substring(0, chunkSize)]
}