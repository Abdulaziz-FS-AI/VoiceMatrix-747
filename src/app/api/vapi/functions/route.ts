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
      .select('id, user_id')
      .eq('vapi_assistant_id', vapiAssistantId)
      .single()

    if (!assistant) {
      return "I don't have access to that information."
    }

    // Get user's business info from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_info')
      .eq('id', assistant.user_id)
      .single()

    // Check knowledge base
    const { data: knowledgeData } = await supabase
      .from('knowledge_base')
      .select('content')
      .eq('assistant_id', assistant.id)
      .limit(5)

    // Simple keyword search in knowledge base
    if (knowledgeData && knowledgeData.length > 0) {
      const queryWords = query.toLowerCase().split(/\s+/)
      const relevantContent = knowledgeData
        .filter(item => 
          queryWords.some(word => 
            item.content.toLowerCase().includes(word)
          )
        )
        .map(item => item.content)
        .slice(0, 3)

      if (relevantContent.length > 0) {
        return `Based on our information: ${relevantContent.join('\n\n')}`
      }
    }

    // Fallback to business info
    const businessInfo = profile?.business_info
    if (businessInfo) {
      const businessContext = `
Business Name: ${businessInfo.name || 'Our Business'}
${businessInfo.address ? `Address: ${businessInfo.address}` : ''}
${businessInfo.website ? `Website: ${businessInfo.website}` : ''}
${businessInfo.hours_of_operation ? `Hours: ${JSON.stringify(businessInfo.hours_of_operation)}` : ''}
      `.trim()

      if (queryWords.some(word => businessContext.toLowerCase().includes(word))) {
        return businessContext
      }
    }

    return "I don't have specific information about that. Let me transfer you to someone who can help."

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
      .select('phone_number')
      .eq('vapi_assistant_id', vapiAssistantId)
      .single()

    if (!assistant?.phone_number) {
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
        phoneNumber: assistant.phone_number,
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