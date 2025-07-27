'use client'

import { ReactNode } from 'react'
import { useWizardStore } from '../lib/wizard-store'

interface Step {
  id: number
  title: string
  component: any
}

interface WizardLayoutProps {
  steps: Step[]
  currentStep: number
  onStepChange: (step: number) => void
  children: ReactNode
}

export function WizardLayout({ steps, currentStep, onStepChange, children }: WizardLayoutProps) {
  const { completedSteps, canProceedToStep, isSubmitting } = useWizardStore()

  const handleStepClick = (stepNumber: number) => {
    if (stepNumber === currentStep || isSubmitting) return
    
    // Allow going back to any previous step
    if (stepNumber < currentStep) {
      onStepChange(stepNumber)
      return
    }
    
    // Allow going forward only if can proceed
    if (canProceedToStep(stepNumber)) {
      onStepChange(stepNumber)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-gray-200">
        <nav className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = completedSteps.has(step.id)
            const canAccess = step.id <= currentStep || canProceedToStep(step.id)
            
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={!canAccess || isSubmitting}
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-600 text-white'
                        : canAccess
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </button>
                
                <div className="ml-2 mr-4">
                  <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                    {step.title}
                  </p>
                </div>
                
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-200 mx-2">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-200'
                      }`} 
                    />
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {children}
      </div>

      {/* Auto-save indicator */}
      <AutoSaveIndicator />
    </div>
  )
}

function AutoSaveIndicator() {
  const { isDirty, lastSaved } = useWizardStore()
  
  if (!lastSaved && !isDirty) return null
  
  return (
    <div className="px-6 py-2 border-t border-gray-100 bg-gray-50">
      <p className="text-xs text-gray-500">
        {isDirty ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving changes...
          </span>
        ) : (
          `Last saved ${lastSaved ? new Date(lastSaved).toLocaleTimeString() : 'Never'}`
        )}
      </p>
    </div>
  )
}