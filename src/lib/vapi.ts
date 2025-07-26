import crypto from 'crypto'

export interface VapiAssistant {
  id: string
  orgId: string
  name: string
  model: {
    provider: string
    model: string
    temperature: number
    systemPrompt: string
    functions?: VapiFunction[]
  }
  voice: {
    provider: string
    voiceId: string
    stability?: number
    similarityBoost?: number
  }
  firstMessage?: string
  recordingEnabled: boolean
  endCallFunctionEnabled: boolean
  createdAt: string
  updatedAt: string
  serverUrl?: string
  serverUrlSecret?: string
}

export interface VapiFunction {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
}

export interface VapiPhoneNumber {
  id: string
  number: string
  provider: string
  assistantId: string
}

export interface CreateAssistantDto {
  name: string
  systemPrompt: string
  voiceId?: string
  firstMessage?: string
  functions?: VapiFunction[]
  serverUrl?: string
  serverUrlSecret?: string
}

export interface UpdateAssistantDto {
  name?: string
  model?: {
    systemPrompt?: string
    temperature?: number
    functions?: VapiFunction[]
  }
  voice?: {
    voiceId?: string
    stability?: number
    similarityBoost?: number
  }
  firstMessage?: string
  serverUrl?: string
}

export interface CreatePhoneNumberDto {
  assistantId: string
  number?: string
  provider?: string
}

export class VapiClient {
  private apiKey: string
  private baseURL = 'https://api.vapi.ai'
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Vapi API error: ${response.status} ${error}`)
    }

    return response.json()
  }

  async createAssistant(data: CreateAssistantDto): Promise<VapiAssistant> {
    return this.request<VapiAssistant>('/assistant', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        model: {
          provider: "openai",
          model: "gpt-4",
          temperature: 0.7,
          systemPrompt: data.systemPrompt,
          functions: data.functions || []
        },
        voice: {
          provider: "11labs",
          voiceId: data.voiceId || "21m00Tcm4TlvDq8ikWAM",
          stability: 0.5,
          similarityBoost: 0.75
        },
        firstMessage: data.firstMessage || "Hello, how can I help you today?",
        endCallFunctionEnabled: true,
        recordingEnabled: true,
        serverUrl: data.serverUrl,
        serverUrlSecret: data.serverUrlSecret
      })
    })
  }

  async getAssistant(assistantId: string): Promise<VapiAssistant> {
    return this.request<VapiAssistant>(`/assistant/${assistantId}`)
  }

  async updateAssistant(
    assistantId: string, 
    updates: UpdateAssistantDto
  ): Promise<VapiAssistant> {
    return this.request<VapiAssistant>(`/assistant/${assistantId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    await this.request(`/assistant/${assistantId}`, {
      method: 'DELETE'
    })
  }

  async createPhoneNumber(data: CreatePhoneNumberDto): Promise<VapiPhoneNumber> {
    return this.request<VapiPhoneNumber>('/phone-number', {
      method: 'POST',
      body: JSON.stringify({
        provider: data.provider || "twilio",
        assistantId: data.assistantId,
        ...(data.number && { number: data.number })
      })
    })
  }

  async getCall(callId: string): Promise<any> {
    return this.request(`/call/${callId}`)
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

export function getAdvancedFunctions(persona: string): VapiFunction[] {
  const config: AssistantConfiguration = {
    persona,
    transferPhoneNumber: '', // Not needed for functions
    businessContext: {
      name: '',
      persona: persona as any
    }
  }

  return VoiceMatrixPromptSystem.generateFunctions(config)
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