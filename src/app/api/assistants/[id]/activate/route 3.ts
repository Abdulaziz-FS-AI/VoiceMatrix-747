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

    // Get assistant info
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'Assistant not found' }, { status: 404 })
    }

    // Get user's business info from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Create business context from profile
    const businessInfo = {
      name: profile.business_info?.name || user.email?.split('@')[0] || 'Business',
      address: profile.business_info?.address || '',
      website: profile.business_info?.website || '',
      hours_of_operation: profile.business_info?.hours_of_operation || {}
    }

    // Initialize Vapi client
    const vapiClient = new VapiClient(process.env.VAPI_API_KEY!)

    // Generate system prompt based on configuration
    const systemPrompt = generateSystemPrompt(
      'general', // Use general persona as fallback
      businessInfo,
      assistant.phone_number || '+1234567890'
    )

    const firstMessage = getFirstMessage(
      'general',
      businessInfo.name
    )

    const functions = getAdvancedFunctions('general')

    // Create Vapi assistant
    const vapiAssistant = await vapiClient.createAssistant({
      name: assistant.name,
      systemPrompt,
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Default voice
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
        phone_number: phoneNumber.number,
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