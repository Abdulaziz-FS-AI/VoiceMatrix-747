'use client'

import { useState } from 'react'
import { useWizardStore } from '../../lib/wizard-store'
import { useWizardContext } from '../WizardProvider'

type CreationStatus = 'idle' | 'creating' | 'success' | 'error'

interface CreationStep {
  id: string
  title: string
  status: 'pending' | 'running' | 'completed' | 'error'
  error?: string
}

export function CreateStep() {
  const { 
    getFormData, 
    setSubmitting, 
    setCreationResult, 
    setError, 
    businessInfo, 
    assistantConfig,
    knowledgeBase,
    qaPairs 
  } = useWizardStore()
  
  const { onComplete } = useWizardContext()
  const [status, setStatus] = useState<CreationStatus>('idle')
  const [steps, setSteps] = useState<CreationStep[]>([])
  const [estimatedCost, setEstimatedCost] = useState<number>(29) // Base cost

  const updateStepStatus = (stepId: string, status: CreationStep['status'], error?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, error } : step
    ))
  }

  const calculateEstimatedCost = () => {
    let cost = 29 // Base plan
    
    // Add cost for knowledge base processing
    if (knowledgeBase && knowledgeBase.length > 5000) {
      cost += 10
    }
    
    // Add cost for Q&A pairs
    if (qaPairs.length > 10) {
      cost += 5
    }
    
    return cost
  }

  const initializeSteps = () => {
    const creationSteps: CreationStep[] = [
      { id: 'business', title: 'Creating business profile', status: 'pending' },
      { id: 'assistant', title: 'Setting up AI assistant', status: 'pending' },
      { id: 'vapi', title: 'Configuring voice AI', status: 'pending' },
      { id: 'phone', title: 'Getting phone number', status: 'pending' },
    ]

    if (knowledgeBase.trim()) {
      creationSteps.splice(2, 0, { 
        id: 'knowledge', 
        title: 'Processing knowledge base', 
        status: 'pending' 
      })
    }

    if (qaPairs.length > 0) {
      creationSteps.splice(-1, 0, { 
        id: 'qa', 
        title: 'Adding Q&A pairs', 
        status: 'pending' 
      })
    }

    creationSteps.push({ id: 'finalize', title: 'Finalizing setup', status: 'pending' })
    
    setSteps(creationSteps)
    return creationSteps
  }

  const createAssistant = async () => {
    setStatus('creating')
    setSubmitting(true)
    
    const creationSteps = initializeSteps()
    
    try {
      // Step 1: Create business
      updateStepStatus('business', 'running')
      const businessResponse = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(businessInfo)
      })
      
      if (!businessResponse.ok) {
        throw new Error('Failed to create business profile')
      }
      
      const business = await businessResponse.json()
      updateStepStatus('business', 'completed')

      // Step 2: Create assistant record
      updateStepStatus('assistant', 'running')
      const assistantData = {
        ...assistantConfig,
        businessId: business.id,
        status: 'creating'
      }
      
      const assistantResponse = await fetch('/api/assistants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assistantData)
      })
      
      if (!assistantResponse.ok) {
        throw new Error('Failed to create assistant')
      }
      
      const assistant = await assistantResponse.json()
      updateStepStatus('assistant', 'completed')

      // Step 3: Process knowledge base (if provided)
      if (knowledgeBase.trim()) {
        updateStepStatus('knowledge', 'running')
        const knowledgeResponse = await fetch(`/api/assistants/${assistant.id}/knowledge-base`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: knowledgeBase })
        })
        
        if (!knowledgeResponse.ok) {
          console.warn('Knowledge base processing failed, continuing...')
          updateStepStatus('knowledge', 'error', 'Processing failed but assistant will still work')
        } else {
          updateStepStatus('knowledge', 'completed')
        }
      }

      // Step 4: Add Q&A pairs (if provided)
      if (qaPairs.length > 0) {
        updateStepStatus('qa', 'running')
        const qaResponse = await fetch(`/api/assistants/${assistant.id}/qa-pairs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairs: qaPairs })
        })
        
        if (!qaResponse.ok) {
          console.warn('Q&A pairs creation failed, continuing...')
          updateStepStatus('qa', 'error', 'Failed to add Q&A pairs')
        } else {
          updateStepStatus('qa', 'completed')
        }
      }

      // Step 5: Create Vapi assistant
      updateStepStatus('vapi', 'running')
      const vapiResponse = await fetch(`/api/assistants/${assistant.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      if (!vapiResponse.ok) {
        throw new Error('Failed to create voice AI assistant')
      }
      
      const vapiResult = await vapiResponse.json()
      updateStepStatus('vapi', 'completed')

      // Step 6: Get phone number
      updateStepStatus('phone', 'running')
      // This would be handled by the activate endpoint
      updateStepStatus('phone', 'completed')

      // Step 7: Finalize
      updateStepStatus('finalize', 'running')
      await new Promise(resolve => setTimeout(resolve, 1000)) // Brief pause for UX
      updateStepStatus('finalize', 'completed')

      // Success!
      setStatus('success')
      setCreationResult({
        assistantId: assistant.id,
        phoneNumber: vapiResult.phoneNumber,
        vapiAssistantId: vapiResult.vapiAssistantId
      })

      // Redirect after a moment
      setTimeout(() => {
        onComplete(assistant.id)
      }, 2000)

    } catch (error) {
      console.error('Assistant creation failed:', error)
      setStatus('error')
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      
      // Mark current step as error
      const runningStep = steps.find(step => step.status === 'running')
      if (runningStep) {
        updateStepStatus(runningStep.id, 'error', error instanceof Error ? error.message : 'Unknown error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const retry = () => {
    setStatus('idle')
    setSteps([])
    setError(undefined)
  }

  // Calculate estimated cost on mount
  useState(() => {
    setEstimatedCost(calculateEstimatedCost())
  })

  if (status === 'creating') {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Creating Your AI Assistant
          </h2>
          <p className="text-gray-600">
            Please wait while we set up your assistant. This may take a few moments.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                step.status === 'completed' 
                  ? 'bg-green-100 text-green-600'
                  : step.status === 'running'
                    ? 'bg-blue-100 text-blue-600'
                    : step.status === 'error'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-400'
              }`}>
                {step.status === 'completed' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : step.status === 'running' ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : step.status === 'error' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              <div className="flex-1">
                <p className={`font-medium ${
                  step.status === 'error' ? 'text-red-900' : 'text-gray-900'
                }`}>
                  {step.title}
                </p>
                {step.error && (
                  <p className="text-sm text-red-600">{step.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Assistant Created Successfully!
          </h2>
          <p className="text-gray-600">
            Your AI assistant is now live and ready to handle calls.
          </p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-800 mb-2">What's Next?</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Your assistant will be available 24/7</li>
            <li>• Test the phone number to ensure everything works</li>
            <li>• Monitor call logs and performance in the dashboard</li>
            <li>• Update knowledge base and settings anytime</li>
          </ul>
        </div>
        
        <p className="text-sm text-gray-500">
          Redirecting to assistant dashboard...
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Creation Failed
          </h2>
          <p className="text-gray-600">
            There was an error creating your assistant. Please try again.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800 mb-2">Error Details:</h3>
          <p className="text-sm text-red-700">
            {useWizardStore.getState().error}
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={retry}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Initial state - show summary and create button
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Review & Create
        </h2>
        <p className="text-gray-600">
          Review your configuration and create your AI assistant.
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Business Information</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Name:</strong> {businessInfo.name}</p>
              <p><strong>Industry:</strong> {businessInfo.industry}</p>
              {businessInfo.website && <p><strong>Website:</strong> {businessInfo.website}</p>}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Assistant Configuration</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Name:</strong> {assistantConfig.name}</p>
              <p><strong>Persona:</strong> {assistantConfig.persona}</p>
              <p><strong>Transfer Number:</strong> {assistantConfig.transferPhoneNumber}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Knowledge Base</h3>
            <p className="text-sm text-gray-600">
              {knowledgeBase.trim() 
                ? `${knowledgeBase.length} characters of content`
                : 'No content added'
              }
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Q&A Pairs</h3>
            <p className="text-sm text-gray-600">
              {qaPairs.length} custom Q&A pair{qaPairs.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Estimated Monthly Cost</h3>
            <p className="text-2xl font-bold text-blue-900">${estimatedCost}</p>
            <p className="text-sm text-blue-700">Includes unlimited calls and support</p>
          </div>
        </div>
      </div>

      {/* Terms and Create Button */}
      <div className="border-t border-gray-200 pt-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Ready to launch!
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Once created, your assistant will be live and ready to receive calls. You can always update settings later.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={createAssistant}
            disabled={status === 'creating'}
            className="px-8 py-3 bg-green-600 text-white text-lg font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            Create AI Assistant
          </button>
        </div>
      </div>
    </div>
  )
}