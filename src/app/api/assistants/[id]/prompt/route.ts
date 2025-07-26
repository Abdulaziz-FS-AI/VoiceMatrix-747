import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { VapiClient, generateSystemPrompt, getFirstMessage, getAdvancedFunctions } from '@/lib/vapi'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const supabase = createServerComponentClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customInstructions } = await request.json()
    const assistantId = params.id

    // 1. Get assistant and business info
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select(`
        *,
        businesses!inner(
          id,
          name,
          address,
          website,
          hours_of_operation,
          user_id
        )
      `)
      .eq('id', assistantId)
      .eq('businesses.user_id', user.id)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })
    }

    const business = assistant.businesses

    try {
      // 2. Regenerate prompt using 5-pillar system
      const systemPrompt = generateSystemPrompt(
        assistant.persona, 
        business, 
        assistant.transfer_phone_number,
        customInstructions
      )
      const firstMessage = getFirstMessage(assistant.persona, business.name)
      const functions = getAdvancedFunctions(assistant.persona)

      console.log('🔄 Regenerating 5-Pillar Prompt:', {
        assistantId,
        persona: assistant.persona,
        businessName: business.name,
        promptLength: systemPrompt.length,
        hasCustomInstructions: !!customInstructions
      })

      // 3. Update Vapi assistant
      const vapi = new VapiClient(process.env.VAPI_API_KEY!)
      await vapi.updateAssistant(assistant.vapi_assistant_id, {
        model: {
          systemPrompt,
          functions
        },
        firstMessage
      })

      // 4. Update database with new configuration
      const { data: updatedAssistant, error: updateError } = await supabase
        .from('assistants')
        .update({
          configuration: {
            ...assistant.configuration,
            systemPrompt,
            firstMessage,
            functions,
            promptGenerated: new Date().toISOString(),
            pillarsUsed: ['identity', 'behavior', 'capabilities', 'knowledge', 'callFlow'],
            customInstructions: customInstructions || null,
            lastUpdated: new Date().toISOString()
          }
        })
        .eq('id', assistantId)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({ 
        success: true,
        assistant: updatedAssistant,
        promptInfo: {
          length: systemPrompt.length,
          pillarsUsed: 5,
          customInstructions: !!customInstructions
        }
      })

    } catch (vapiError) {
      console.error('Failed to update Vapi assistant:', vapiError)
      return NextResponse.json(
        { error: 'Failed to update voice assistant configuration' }, 
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Prompt update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Get current prompt configuration
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const supabase = createServerComponentClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assistantId = params.id

    // Get assistant configuration
    const { data: assistant, error } = await supabase
      .from('assistants')
      .select(`
        id,
        name,
        persona,
        configuration,
        businesses!inner(
          name,
          user_id
        )
      `)
      .eq('id', assistantId)
      .eq('businesses.user_id', user.id)
      .single()

    if (error || !assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })
    }

    const config = assistant.configuration || {}

    return NextResponse.json({
      assistantId: assistant.id,
      name: assistant.name,
      persona: assistant.persona,
      businessName: (assistant.businesses as any)?.[0]?.name || 'Unknown Business',
      promptInfo: {
        length: config.systemPrompt?.length || 0,
        lastGenerated: config.promptGenerated,
        pillarsUsed: config.pillarsUsed || [],
        customInstructions: config.customInstructions,
        lastUpdated: config.lastUpdated
      },
      currentPrompt: config.systemPrompt,
      firstMessage: config.firstMessage,
      functions: config.functions
    })

  } catch (error) {
    console.error('Get prompt error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}