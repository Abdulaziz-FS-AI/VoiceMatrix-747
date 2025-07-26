import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { functionCall, call } = body

    if (functionCall.name === 'searchKnowledgeBase') {
      const result = await searchKnowledgeBase(
        call.assistantId, 
        functionCall.parameters.query
      )
      
      return NextResponse.json({ result })
    }

    if (functionCall.name === 'transferCall') {
      const result = await transferCall(
        call.assistantId,
        call.id,
        functionCall.parameters.reason
      )
      
      return NextResponse.json({ result })
    }

    return NextResponse.json({ result: "Function not found" })

  } catch (error) {
    console.error('Function call error:', error)
    return NextResponse.json({ 
      result: "I'm having trouble accessing that information right now. Let me transfer you to someone who can help." 
    })
  }
}

async function searchKnowledgeBase(vapiAssistantId: string, query: string) {
  const supabase = createServerComponentClient()

  try {
    // Find assistant
    const { data: assistant } = await supabase
      .from('assistants')
      .select(`
        id,
        qa_pairs(*)
      `)
      .eq('vapi_assistant_id', vapiAssistantId)
      .single()

    if (!assistant) {
      return "I don't have access to that information."
    }

    // Check Q&A pairs first (higher priority)
    const qaMatch = findQAMatch(query, assistant.qa_pairs)
    if (qaMatch) {
      return qaMatch.answer
    }

    // Generate query embedding using OpenAI
    const embedding = await generateEmbedding(query)

    // Vector search using Supabase function
    const { data: chunks, error } = await supabase.rpc('search_knowledge_chunks', {
      assistant_id: assistant.id,
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 3
    })

    if (error || !chunks?.length) {
      return "I don't have specific information about that. Let me transfer you to someone who can help."
    }

    // Format response from chunks
    const context = chunks
      .map((chunk: any) => chunk.content)
      .join('\n\n')

    return `Based on our information: ${context}`

  } catch (error) {
    console.error('Knowledge search error:', error)
    return "I'm having trouble accessing that information right now. Let me transfer you to someone who can help."
  }
}

async function transferCall(vapiAssistantId: string, callId: string, reason: string) {
  const supabase = createServerComponentClient()

  try {
    // Find assistant and get transfer number
    const { data: assistant } = await supabase
      .from('assistants')
      .select('transfer_phone_number')
      .eq('vapi_assistant_id', vapiAssistantId)
      .single()

    if (!assistant?.transfer_phone_number) {
      return "I apologize, but I'm unable to transfer your call right now. Please call back later."
    }

    // Log transfer attempt
    await supabase
      .from('call_logs')
      .update({
        summary: `Transfer requested: ${reason}`
      })
      .eq('vapi_call_id', callId)

    // Return transfer instruction to Vapi
    return {
      result: `Transferring your call now. Please hold while I connect you.`,
      transfer: {
        phoneNumber: assistant.transfer_phone_number,
        reason: reason
      }
    }

  } catch (error) {
    console.error('Transfer call error:', error)
    return "I apologize, but I'm unable to transfer your call right now. Please call back later."
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  })

  if (!response.ok) {
    throw new Error('Failed to generate embedding')
  }

  const data = await response.json()
  return data.data[0].embedding
}

function findQAMatch(query: string, qaPairs: any[]) {
  const normalizedQuery = query.toLowerCase().trim()
  
  return qaPairs
    .sort((a, b) => b.priority - a.priority)
    .find(qa => {
      const normalizedQuestion = qa.question.toLowerCase().trim()
      
      // Exact match
      if (normalizedQuery === normalizedQuestion) {
        return true
      }
      
      // Contains match
      if (normalizedQuery.includes(normalizedQuestion) || 
          normalizedQuestion.includes(normalizedQuery)) {
        return true
      }
      
      // Keyword overlap
      const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 3)
      const questionWords = normalizedQuestion.split(/\s+/).filter(w => w.length > 3)
      const overlap = queryWords.filter(word => questionWords.includes(word)).length
      
      return overlap >= Math.min(queryWords.length, questionWords.length) * 0.6
    })
}