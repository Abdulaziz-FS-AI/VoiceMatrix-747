import { NextRequest, NextResponse } from 'next/server'
import { VoiceMatrixPromptSystem } from '@/lib/assistant-prompts'

export async function POST(request: NextRequest) {
  try {
    const { persona, businessName, transferPhoneNumber, customInstructions } = await request.json()

    // Test the 5-pillar system
    const config = {
      persona: persona || 'restaurant',
      transferPhoneNumber: transferPhoneNumber || '+1-555-0123',
      businessContext: {
        name: businessName || 'Test Restaurant',
        address: '123 Main Street, City, State 12345',
        website: 'https://testrestaurant.com',
        hours_of_operation: {
          monday: '9:00 AM - 10:00 PM',
          tuesday: '9:00 AM - 10:00 PM',
          wednesday: '9:00 AM - 10:00 PM',
          thursday: '9:00 AM - 10:00 PM',
          friday: '9:00 AM - 11:00 PM',
          saturday: '9:00 AM - 11:00 PM',
          sunday: '10:00 AM - 9:00 PM'
        },
        persona: persona || 'restaurant'
      },
      customInstructions
    }

    // Generate all components
    const systemPrompt = VoiceMatrixPromptSystem.generatePrompt(config)
    const firstMessage = VoiceMatrixPromptSystem.generateFirstMessage(config)
    const functions = VoiceMatrixPromptSystem.generateFunctions(config)

    return NextResponse.json({
      success: true,
      testResults: {
        persona: config.persona,
        businessName: config.businessContext.name,
        promptLength: systemPrompt.length,
        hasCustomInstructions: !!customInstructions,
        pillarsGenerated: 5,
        functionsCount: functions.length
      },
      generated: {
        systemPrompt,
        firstMessage,
        functions
      },
      analysis: {
        promptSections: {
          identity: systemPrompt.includes('PILLAR 1: CORE IDENTITY'),
          behavior: systemPrompt.includes('PILLAR 2: BEHAVIORAL GUIDELINES'),
          capabilities: systemPrompt.includes('PILLAR 3: FUNCTIONAL CAPABILITIES'),
          knowledge: systemPrompt.includes('PILLAR 4: KNOWLEDGE INTEGRATION'),
          callFlow: systemPrompt.includes('PILLAR 5: CALL FLOW')
        },
        qualityMetrics: {
          lengthScore: systemPrompt.length > 2000 ? 'Comprehensive' : 'Basic',
          personalityScore: systemPrompt.includes('tone') && systemPrompt.includes('personality') ? 'Strong' : 'Weak',
          functionalityScore: functions.length >= 2 ? 'Complete' : 'Limited',
          businessIntegration: systemPrompt.includes(config.businessContext.name) ? 'Integrated' : 'Generic'
        }
      }
    })

  } catch (error) {
    console.error('Prompt test error:', error)
    return NextResponse.json(
      { error: 'Failed to test prompt system' }, 
      { status: 500 }
    )
  }
}

export async function GET() {
  // Test all personas
  const personas = ['restaurant', 'sales', 'medical', 'legal', 'general']
  const testResults = []

  for (const persona of personas) {
    const config = {
      persona,
      transferPhoneNumber: '+1-555-0123',
      businessContext: {
        name: `Test ${persona.charAt(0).toUpperCase() + persona.slice(1)} Business`,
        address: '123 Business Street, City, State 12345',
        website: `https://test${persona}.com`,
        hours_of_operation: { monday: '9:00 AM - 5:00 PM' },
        persona: persona as any
      }
    }

    const systemPrompt = VoiceMatrixPromptSystem.generatePrompt(config)
    const firstMessage = VoiceMatrixPromptSystem.generateFirstMessage(config)
    const functions = VoiceMatrixPromptSystem.generateFunctions(config)

    testResults.push({
      persona,
      promptLength: systemPrompt.length,
      firstMessage,
      functionsCount: functions.length,
      hasAllPillars: [
        'PILLAR 1: CORE IDENTITY',
        'PILLAR 2: BEHAVIORAL GUIDELINES', 
        'PILLAR 3: FUNCTIONAL CAPABILITIES',
        'PILLAR 4: KNOWLEDGE INTEGRATION',
        'PILLAR 5: CALL FLOW'
      ].every(pillar => systemPrompt.includes(pillar))
    })
  }

  return NextResponse.json({
    success: true,
    testResults,
    systemStatus: {
      totalPersonas: personas.length,
      allWorking: testResults.every(r => r.hasAllPillars && r.promptLength > 1000),
      averagePromptLength: Math.round(testResults.reduce((sum, r) => sum + r.promptLength, 0) / testResults.length)
    }
  })
}