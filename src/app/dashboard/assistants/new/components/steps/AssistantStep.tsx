'use client'

import { useState } from 'react'
import { useWizardStore } from '../../lib/wizard-store'

const PERSONAS = [
  {
    id: 'restaurant',
    title: 'Restaurant & Food Service',
    description: 'Handle reservations, menu questions, and customer service',
    icon: '🍽️'
  },
  {
    id: 'sales',
    title: 'Sales Assistant',
    description: 'Qualify leads, schedule meetings, and provide product info',
    icon: '💼'
  },
  {
    id: 'medical',
    title: 'Medical Office',
    description: 'Schedule appointments and handle general inquiries',
    icon: '🏥'
  },
  {
    id: 'legal',
    title: 'Legal Services',
    description: 'Initial client intake and appointment scheduling',
    icon: '⚖️'
  },
  {
    id: 'general',
    title: 'General Business',
    description: 'Handle customer service and general inquiries',
    icon: '🏢'
  }
]

const VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Professional Female)', gender: 'female' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Friendly Male)', gender: 'male' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Authoritative Male)', gender: 'male' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Sarah (Warm Female)', gender: 'female' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam (Casual Male)', gender: 'male' }
]

const PERSONALITY_TRAITS = [
  'Helpful', 'Professional', 'Friendly', 'Patient', 'Knowledgeable',
  'Empathetic', 'Efficient', 'Courteous', 'Reliable', 'Attentive'
]

export function AssistantStep() {
  const { assistantConfig, updateAssistantConfig, markStepCompleted, businessInfo } = useWizardStore()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: any) => {
    updateAssistantConfig({ [field]: value })
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handlePersonalityChange = (field: 'tone' | 'traits', value: any) => {
    updateAssistantConfig({
      personality: {
        tone: assistantConfig.personality?.tone || 'professional',
        traits: assistantConfig.personality?.traits || [],
        ...assistantConfig.personality,
        [field]: value
      }
    })
  }

  const toggleTrait = (trait: string) => {
    const currentTraits = assistantConfig.personality?.traits || []
    const newTraits = currentTraits.includes(trait)
      ? currentTraits.filter(t => t !== trait)
      : [...currentTraits, trait]
    
    handlePersonalityChange('traits', newTraits)
  }

  const generateGreeting = () => {
    const businessName = businessInfo.name
    const persona = assistantConfig.persona
    
    const greetings = {
      restaurant: `Hello! Thank you for calling ${businessName}. I'm here to help with reservations, menu questions, or any other inquiries you might have. How can I assist you today?`,
      sales: `Hi there! Thanks for your interest in ${businessName}. I'm here to help answer your questions and see how we can best serve your needs. What can I help you with?`,
      medical: `Hello, you've reached ${businessName}. I can help schedule appointments or answer general questions. Please note I cannot provide medical advice. How may I assist you?`,
      legal: `Good day, you've reached ${businessName}. I can help schedule consultations or provide general firm information. Please note I cannot provide legal advice. How can I help you today?`,
      general: `Hello! Thank you for calling ${businessName}. I'm here to help answer your questions and assist with your needs. How can I help you today?`
    }

    const greeting = greetings[persona as keyof typeof greetings] || greetings.general
    handleInputChange('greetingMessage', greeting)
  }

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''))
  }

  const validateAndProceed = () => {
    const newErrors: Record<string, string> = {}
    
    if (!assistantConfig.name?.trim()) {
      newErrors.name = 'Assistant name is required'
    }
    
    if (!assistantConfig.persona) {
      newErrors.persona = 'Please select a persona'
    }

    if (!assistantConfig.transferPhoneNumber?.trim()) {
      newErrors.transferPhoneNumber = 'Transfer phone number is required'
    } else if (!validatePhoneNumber(assistantConfig.transferPhoneNumber)) {
      newErrors.transferPhoneNumber = 'Please enter a valid phone number'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      markStepCompleted(2)
      return true
    }
    
    return false
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Assistant Configuration
        </h2>
        <p className="text-gray-600">
          Configure your AI assistant's personality and behavior.
        </p>
      </div>

      {/* Assistant Name */}
      <div>
        <label htmlFor="assistantName" className="block text-sm font-medium text-gray-700 mb-1">
          Assistant Name *
        </label>
        <input
          type="text"
          id="assistantName"
          value={assistantConfig.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className={`w-full max-w-md px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="e.g., Sarah, Alex, Emily"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Persona Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Assistant Persona *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PERSONAS.map(persona => (
            <button
              key={persona.id}
              type="button"
              onClick={() => handleInputChange('persona', persona.id)}
              className={`p-4 text-left rounded-lg border-2 transition-all hover:shadow-md ${
                assistantConfig.persona === persona.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">{persona.icon}</div>
              <h3 className="font-medium text-gray-900 mb-1">{persona.title}</h3>
              <p className="text-sm text-gray-600">{persona.description}</p>
            </button>
          ))}
        </div>
        {errors.persona && <p className="mt-1 text-sm text-red-600">{errors.persona}</p>}
      </div>

      {/* Voice Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Voice Selection
        </label>
        <div className="space-y-2">
          {VOICES.map(voice => (
            <label key={voice.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="voice"
                value={voice.id}
                checked={assistantConfig.voiceId === voice.id}
                onChange={(e) => handleInputChange('voiceId', e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="ml-3">
                <span className="font-medium text-gray-900">{voice.name}</span>
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {voice.gender}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Personality Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Personality</h3>
        
        {/* Tone */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Communication Tone
          </label>
          <div className="flex space-x-4">
            {['professional', 'friendly', 'casual'].map(tone => (
              <label key={tone} className="flex items-center">
                <input
                  type="radio"
                  name="tone"
                  value={tone}
                  checked={assistantConfig.personality?.tone === tone}
                  onChange={(e) => handlePersonalityChange('tone', e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">{tone}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Traits */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personality Traits (Select up to 5)
          </label>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_TRAITS.map(trait => {
              const isSelected = assistantConfig.personality?.traits?.includes(trait)
              const canSelect = (assistantConfig.personality?.traits?.length || 0) < 5
              
              return (
                <button
                  key={trait}
                  type="button"
                  onClick={() => toggleTrait(trait)}
                  disabled={!isSelected && !canSelect}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : canSelect
                        ? 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {trait}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Transfer Phone Number */}
      <div>
        <label htmlFor="transferPhone" className="block text-sm font-medium text-gray-700 mb-1">
          Transfer Phone Number *
        </label>
        <input
          type="tel"
          id="transferPhone"
          value={assistantConfig.transferPhoneNumber || ''}
          onChange={(e) => handleInputChange('transferPhoneNumber', e.target.value)}
          className={`w-full max-w-md px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.transferPhoneNumber ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="+1 (555) 123-4567"
        />
        <p className="mt-1 text-sm text-gray-600">
          Number to transfer calls when human assistance is needed
        </p>
        {errors.transferPhoneNumber && <p className="mt-1 text-sm text-red-600">{errors.transferPhoneNumber}</p>}
      </div>

      {/* Greeting Message */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="greeting" className="block text-sm font-medium text-gray-700">
            Greeting Message
          </label>
          <button
            type="button"
            onClick={generateGreeting}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Generate suggestion
          </button>
        </div>
        <textarea
          id="greeting"
          value={assistantConfig.greetingMessage || ''}
          onChange={(e) => handleInputChange('greetingMessage', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="How your assistant will greet callers..."
        />
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          onClick={validateAndProceed}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}