import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { VapiClient } from '@/lib/vapi'
import { VoiceMatrixPromptSystem } from '@/lib/assistant-prompts'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Support both old and new format
    const isWizardFormat = body.businessId && body.name && body.persona
    
    if (isWizardFormat) {
      // Handle wizard format
      const { businessId, name, persona, transferPhoneNumber, voiceId, greetingMessage, personality, status } = body
      
      // Validate required fields
      if (!businessId || !name || !persona || !transferPhoneNumber) {
        return NextResponse.json(
          { error: 'Missing required fields' }, 
          { status: 400 }
        )
      }

      // Verify business belongs to user
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .eq('user_id', user.id)
        .single()

      if (businessError || !business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 })
      }

      // Create assistant record
      const { data: assistant, error } = await supabase
        .from('assistants')
        .insert({
          business_id: businessId,
          name,
          description: `AI Receptionist for ${business.name}`,
          persona,
          transfer_phone_number: transferPhoneNumber,
          status: status || 'configuring',
          configuration: {
            voiceId,
            greetingMessage,
            personality
          }
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create assistant:', error)
        return NextResponse.json({ error: 'Failed to create assistant' }, { status: 500 })
      }

      return NextResponse.json(assistant)
    }
    
    // Handle legacy format
    const { persona, transferPhoneNumber, name, customInstructions } = body

    // Validate required fields
    if (!persona || !transferPhoneNumber || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      )
    }

    // 1. Get user profile for business context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // 2. Create assistant record (linked directly to user)
    const { data: assistant, error } = await supabase
      .from('assistants')
      .insert({
        user_id: user.id,
        name,
        description: `AI Receptionist for ${user.email?.split('@')[0] || 'Business'}`,
        status: 'configuring'
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create assistant:', error)
      return NextResponse.json({ error: 'Failed to create assistant' }, { status: 500 })
    }

    try {
      // 3. Create business context for prompt generation
      const businessContext = {
        name: user.email?.split('@')[0] || 'Your Business',
        address: '',
        website: '',
        hours_of_operation: {
          monday: '9:00 AM - 5:00 PM',
          tuesday: '9:00 AM - 5:00 PM',
          wednesday: '9:00 AM - 5:00 PM',
          thursday: '9:00 AM - 5:00 PM',
          friday: '9:00 AM - 5:00 PM',
          saturday: 'Closed',
          sunday: 'Closed'
        },
        persona: persona
      }

      // 4. Generate sophisticated prompt using 5-pillar system
      const promptConfig = {
        persona,
        transferPhoneNumber,
        businessContext,
        customInstructions
      }
      
      const systemPrompt = VoiceMatrixPromptSystem.generatePrompt(promptConfig)
      const firstMessage = VoiceMatrixPromptSystem.generateFirstMessage(promptConfig)
      const functions = VoiceMatrixPromptSystem.generateFunctions(promptConfig)
      
      console.log('🚀 Generated 5-Pillar System Prompt:', {
        persona,
        businessName: businessContext.name,
        promptLength: systemPrompt.length,
        customInstructions: !!customInstructions
      })
      
      // 5. Create Vapi assistant
      const vapi = new VapiClient(process.env.VAPI_API_KEY!)
      const vapiAssistant = await vapi.createAssistant({
        name: `${businessContext.name} AI Receptionist`,
        systemPrompt,
        firstMessage,
        functions,
        serverUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/vapi/functions`,
        serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET
      })

      // 6. Create phone number
      const phoneNumber = await vapi.createPhoneNumber({
        assistantId: vapiAssistant.id
      })

      // 7. Update assistant with Vapi IDs and generated prompt
      const { data: updatedAssistant, error: updateError } = await supabase
        .from('assistants')
        .update({
          vapi_assistant_id: vapiAssistant.id,
          phone_number: phoneNumber.number,
          status: 'active'
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

    // Get all assistants for the current user (proper isolation)
    const { data: assistants, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

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