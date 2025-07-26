import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { VapiClient, generateSystemPrompt, getFirstMessage, getAdvancedFunctions } from '@/lib/vapi'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { businessId, persona, transferPhoneNumber, name, customInstructions } = body

    // Validate required fields
    if (!businessId || !persona || !transferPhoneNumber || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      )
    }

    // 1. Create assistant record
    const { data: assistant, error } = await supabase
      .from('assistants')
      .insert({
        business_id: businessId,
        name,
        persona,
        transfer_phone_number: transferPhoneNumber,
        status: 'configuring'
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create assistant:', error)
      return NextResponse.json({ error: 'Failed to create assistant' }, { status: 500 })
    }

    try {
      // 2. Get business info for prompt
      const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single()

      if (!business) {
        throw new Error('Business not found')
      }

      // 3. Create Vapi assistant using 5-pillar system
      const vapi = new VapiClient(process.env.VAPI_API_KEY!)
      
      // Generate sophisticated prompt using 5-pillar system
      const systemPrompt = generateSystemPrompt(persona, business, transferPhoneNumber, customInstructions)
      const firstMessage = getFirstMessage(persona, business.name)
      const functions = getAdvancedFunctions(persona)
      
      console.log('🚀 Generated 5-Pillar System Prompt:', {
        persona,
        businessName: business.name,
        promptLength: systemPrompt.length,
        customInstructions: !!customInstructions
      })
      
      const vapiAssistant = await vapi.createAssistant({
        name: `${business.name} AI Receptionist`,
        systemPrompt,
        firstMessage,
        functions,
        serverUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/vapi/functions`,
        serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET
      })

      // 4. Create phone number
      const phoneNumber = await vapi.createPhoneNumber({
        assistantId: vapiAssistant.id
      })

      // 5. Update assistant with Vapi IDs and generated prompt
      const { data: updatedAssistant, error: updateError } = await supabase
        .from('assistants')
        .update({
          vapi_assistant_id: vapiAssistant.id,
          vapi_phone_number_id: phoneNumber.id,
          status: 'active',
          configuration: {
            systemPrompt,
            firstMessage,
            functions,
            promptGenerated: new Date().toISOString(),
            pillarsUsed: ['identity', 'behavior', 'capabilities', 'knowledge', 'callFlow'],
            customInstructions: customInstructions || null
          }
        })
        .eq('id', assistant.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({ 
        success: true, 
        assistant: updatedAssistant,
        phoneNumber: phoneNumber.number 
      })

    } catch (vapiError) {
      console.error('Vapi integration failed:', vapiError)
      
      // Mark assistant as error state
      await supabase
        .from('assistants')
        .update({ status: 'error' })
        .eq('id', assistant.id)

      return NextResponse.json(
        { error: 'Failed to configure voice assistant' }, 
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Assistant creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all assistants for the user's businesses
    const { data: assistants, error } = await supabase
      .from('assistants')
      .select(`
        *,
        businesses!inner(
          id,
          name,
          user_id
        )
      `)
      .eq('businesses.user_id', user.id)

    if (error) {
      console.error('Failed to fetch assistants:', error)
      return NextResponse.json({ error: 'Failed to fetch assistants' }, { status: 500 })
    }

    return NextResponse.json({ assistants })

  } catch (error) {
    console.error('Get assistants error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}