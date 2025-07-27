import { VapiClient as VapiSDK } from "@vapi-ai/server-sdk"
import crypto from 'crypto'

// Define our own types since the SDK doesn't export them
export interface VapiAssistant {
  id: string
  orgId?: string
  name: string
  model?: any
  voice?: any
  firstMessage?: string
  createdAt: string
  updatedAt: string
  server?: any
}

export interface VapiPhoneNumber {
  id: string
  number: string
  provider: string
  assistantId: string
}

export interface VapiTool {
  type: "apiRequest"
  name: string
  description: string
  url: string
  method: "POST" | "GET" | "PUT" | "DELETE"
  headers?: Record<string, any>
  body?: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
  timeoutSeconds?: number
}

export interface CreateAssistantDto {
  name: string
  systemPrompt: string
  voiceId?: string
  firstMessage?: string
  tools?: VapiTool[]
  serverUrl?: string
  transferPhoneNumber?: string
}

export interface UpdateAssistantDto {
  name?: string
  model?: {
    messages?: Array<{
      role: "system" | "user" | "assistant"
      content: string
    }>
    tools?: VapiTool[]
    temperature?: number
  }
  voice?: {
    provider?: string
    voiceId?: string
  }
  firstMessage?: string
  server?: {
    url?: string
    timeoutSeconds?: number
  }
}

export interface CreatePhoneNumberDto {
  assistantId: string
  number?: string
  provider?: string
}

export class VapiClient {
  private client: VapiSDK
  
  constructor(apiKey: string) {
    this.client = new VapiSDK({ token: apiKey })
  }

  async createAssistant(data: CreateAssistantDto) {
    const assistantConfig: any = {
      name: data.name,
      model: {
        provider: "openai",
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: data.systemPrompt
          }
        ],
        temperature: 0.7,
        ...(data.tools && data.tools.length > 0 && {
          tools: data.tools
        })
      },
      voice: {
        provider: "11labs",
        voiceId: data.voiceId || "21m00Tcm4TlvDq8ikWAM"
      },
      firstMessage: data.firstMessage || "Hello, how can I help you today?",
      ...(data.serverUrl && {
        server: {
          url: data.serverUrl,
          timeoutSeconds: 20
        }
      })
    }

    return await this.client.assistants.create(assistantConfig)
  }

  async getAssistant(assistantId: string) {
    return await this.client.assistants.get(assistantId)
  }

  async updateAssistant(assistantId: string, updates: UpdateAssistantDto) {
    const updateConfig: any = {}
    
    if (updates.name) {
      updateConfig.name = updates.name
    }
    
    if (updates.model) {
      updateConfig.model = {}
      
      if (updates.model.messages) {
        updateConfig.model.messages = updates.model.messages
      }
      
      if (updates.model.tools) {
        updateConfig.model.tools = updates.model.tools
      }
      
      if (updates.model.temperature !== undefined) {
        updateConfig.model.temperature = updates.model.temperature
      }
    }
    
    if (updates.voice) {
      updateConfig.voice = updates.voice
    }
    
    if (updates.firstMessage) {
      updateConfig.firstMessage = updates.firstMessage
    }
    
    if (updates.server) {
      updateConfig.server = updates.server
    }

    return await this.client.assistants.update(assistantId, updateConfig)
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    await this.client.assistants.delete(assistantId)
  }

  async createPhoneNumber(data: CreatePhoneNumberDto) {
    const config: any = {
      provider: (data.provider as "twilio") || "twilio",
      assistantId: data.assistantId
    }

    // Add Twilio-specific fields if using Twilio provider
    if (config.provider === "twilio") {
      config.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
      config.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
      if (data.number) {
        config.number = data.number
      }
    }

    return await this.client.phoneNumbers.create(config)
  }

  async getCall(callId: string) {
    return await this.client.calls.get(callId)
  }

  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    return signature === expectedSignature
  }
}

// Webhook event types
export interface VapiWebhookEvent {
  type: 'call-start' | 'call-end' | 'function-call' | 'transcript'
  data: any
  signature?: string
}

export interface CallStartData {
  call: {
    id: string
    assistantId: string
  }
  customer?: {
    number: string
  }
  timestamp: string
}

export interface CallEndData {
  call: {
    id: string
    duration: number
  }
  transcript: any
  summary: string
  endedReason: string
  timestamp: string
}

export interface FunctionCallData {
  call: {
    id: string
    assistantId: string
  }
  functionCall: {
    name: string
    parameters: Record<string, any>
  }
}

export interface FunctionResponse {
  result: string
  confidence?: number
  transfer?: {
    phoneNumber: string
    reason: string
  }
}

// Import the new 5-pillar prompting system
import { VoiceMatrixPromptSystem, type AssistantConfiguration } from './assistant-prompts'

// Enhanced helper functions using 5-pillar system
export function generateSystemPrompt(
  persona: string,
  businessInfo: any,
  transferPhoneNumber: string,
  customInstructions?: string
): string {
  const config: AssistantConfiguration = {
    persona,
    transferPhoneNumber,
    businessContext: {
      name: businessInfo.name,
      address: businessInfo.address,
      website: businessInfo.website,
      hours_of_operation: businessInfo.hours_of_operation,
      persona: persona as any
    },
    customInstructions
  }

  return VoiceMatrixPromptSystem.generatePrompt(config)
}

export function getFirstMessage(persona: string, businessName: string): string {
  const config: AssistantConfiguration = {
    persona,
    transferPhoneNumber: '', // Not needed for first message
    businessContext: {
      name: businessName,
      persona: persona as any
    }
  }

  return VoiceMatrixPromptSystem.generateFirstMessage(config)
}

export function getAdvancedFunctions(persona: string): VapiTool[] {
  const config: AssistantConfiguration = {
    persona,
    transferPhoneNumber: '', // Not needed for functions
    businessContext: {
      name: '',
      persona: persona as any
    }
  }

  return VoiceMatrixPromptSystem.generateFunctions(config, '')
}

// Legacy functions for backward compatibility
export function generateBasicSystemPrompt(
  persona: string,
  businessInfo: any
): string {
  const basePrompt = `You are a professional AI receptionist for ${businessInfo.name}.`
  
  const personaPrompts = {
    restaurant: `${basePrompt} You help customers with reservations, menu questions, hours, and general inquiries. Always be warm and welcoming.`,
    sales: `${basePrompt} You're a helpful sales assistant. Qualify leads by asking about their needs, timeline, and budget.`,
    medical: `${basePrompt} You handle appointment scheduling and general inquiries. NEVER provide medical advice.`,
    legal: `${basePrompt} You help with appointment scheduling and general firm information. NEVER provide legal advice.`,
    general: `${basePrompt} You answer questions about our business and services, take messages, and help customers.`
  }

  const prompt = personaPrompts[persona as keyof typeof personaPrompts] || personaPrompts.general

  return prompt + `

IMPORTANT INSTRUCTIONS:
- Always be professional, helpful, and friendly
- If you don't know something, use the searchKnowledgeBase function
- For complex requests or when asked to speak to someone, use the transferCall function
- Keep responses concise but complete
- Always end calls politely and offer additional help

Transfer the call if:
- Caller requests to speak to a human
- You cannot answer their question after searching
- They want to make a purchase that requires human intervention
- The conversation becomes complex or emotional`
}