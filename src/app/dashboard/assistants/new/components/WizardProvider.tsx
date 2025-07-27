'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAutoSave } from '../lib/wizard-store'

interface WizardContextType {
  onComplete: (assistantId: string) => void
}

const WizardContext = createContext<WizardContextType | null>(null)

export const useWizardContext = () => {
  const context = useContext(WizardContext)
  if (!context) {
    throw new Error('useWizardContext must be used within WizardProvider')
  }
  return context
}

interface WizardProviderProps {
  children: ReactNode
  onComplete: (assistantId: string) => void
}

export function WizardProvider({ children, onComplete }: WizardProviderProps) {
  // Enable auto-save functionality
  useAutoSave()
  
  return (
    <WizardContext.Provider value={{ onComplete }}>
      {children}
    </WizardContext.Provider>
  )
}