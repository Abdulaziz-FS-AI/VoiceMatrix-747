import { createServerComponentClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { VapiClient, generateSystemPrompt, getFirstMessage, getAdvancedFunctions } from '@/lib/vapi'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient(cookieStore)
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assistantId = params.id

    // Get assistant with business info
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select(`
        *,
        businesses!inner(*)
      `)
      .eq('id', assistantId)
      .eq('businesses.user_id', user.id)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })
    }

    // Initialize Vapi client
    const vapiClient = new VapiClient(process.env.VAPI_API_KEY!)

    // Generate system prompt based on configuration
    const systemPrompt = generateSystemPrompt(
      assistant.persona,
      assistant.businesses,
      assistant.transfer_phone_number
    )

    const firstMessage = getFirstMessage(
      assistant.persona,
      assistant.businesses.name
    )

    const functions = getAdvancedFunctions(assistant.persona)

    // Create Vapi assistant
    const vapiAssistant = await vapiClient.createAssistant({
      name: assistant.name,
      systemPrompt,
      voiceId: assistant.configuration?.voiceId,
      firstMessage,
      functions,
      serverUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/vapi/functions`,
      serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET
    })

    // Create phone number
    const phoneNumber = await vapiClient.createPhoneNumber({
      assistantId: vapiAssistant.id
    })

    // Update assistant with Vapi IDs
    const { error: updateError } = await supabase
      .from('assistants')
      .update({
        vapi_assistant_id: vapiAssistant.id,
        vapi_phone_number_id: phoneNumber.id,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', assistantId)

    if (updateError) {
      console.error('Failed to update assistant:', updateError)
      // Note: Vapi assistant was created but our DB update failed
      // In production, we might want to delete the Vapi assistant or implement cleanup
    }

    return NextResponse.json({
      success: true,
      vapiAssistantId: vapiAssistant.id,
      phoneNumber: phoneNumber.number,
      phoneNumberId: phoneNumber.id
    })

  } catch (error) {
    console.error('Assistant activation error:', error)
    
    // Update assistant status to error
    try {
      await supabase
        .from('assistants')
        .update({ status: 'error' })
        .eq('id', assistantId)
    } catch (updateError) {
      console.error('Failed to update assistant status:', updateError)
    }

    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to activate assistant' 
    }, { status: 500 })
  }
}