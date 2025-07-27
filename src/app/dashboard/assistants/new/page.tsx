'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WizardProvider } from './components/WizardProvider'
import { WizardLayout } from './components/WizardLayout'
import { AssistantStep } from './components/steps/AssistantStep'
import { KnowledgeStep } from './components/steps/KnowledgeStep'
import { QAStep } from './components/steps/QAStep'
import { CreateStep } from './components/steps/CreateStep'

const STEPS = [
  { id: 1, title: 'Assistant Configuration', component: AssistantStep },
  { id: 2, title: 'Knowledge Base', component: KnowledgeStep },
  { id: 3, title: 'Q&A Pairs', component: QAStep },
  { id: 4, title: 'Create & Launch', component: CreateStep },
]

export default function NewAssistantWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)

  const handleStepChange = (step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step)
    }
  }

  const handleComplete = (assistantId: string) => {
    // Redirect to assistant dashboard
    router.push(`/dashboard/assistants/${assistantId}`)
  }

  const CurrentStepComponent = STEPS[currentStep - 1].component

  return (
    <WizardProvider onComplete={handleComplete}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create New AI Assistant
            </h1>
            <p className="text-gray-600">
              Set up your AI receptionist in 4 simple steps
            </p>
          </div>

          <WizardLayout
            steps={STEPS}
            currentStep={currentStep}
            onStepChange={handleStepChange}
          >
            <CurrentStepComponent />
          </WizardLayout>
        </div>
      </div>
    </WizardProvider>
  )
}