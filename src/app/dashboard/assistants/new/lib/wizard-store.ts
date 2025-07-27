import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface BusinessInfo {
  name: string
  industry: string
  website?: string
  address?: string
  timezone: string
  hoursOfOperation: {
    [key: string]: {
      open: string
      close: string
      closed: boolean
    }
  }
}

export interface AssistantConfig {
  name: string
  persona: 'restaurant' | 'sales' | 'medical' | 'legal' | 'general'
  voiceId: string
  language: string
  transferPhoneNumber: string
  greetingMessage: string
  personality: {
    tone: 'professional' | 'friendly' | 'casual'
    traits: string[]
  }
}

export interface QAPair {
  id: string
  question: string
  answer: string
  priority: number
}

export interface CreationResult {
  assistantId: string
  phoneNumber: string
  vapiAssistantId: string
}

interface WizardState {
  // Form data
  businessInfo: Partial<BusinessInfo>
  assistantConfig: Partial<AssistantConfig>
  knowledgeBase: string
  qaPairs: QAPair[]
  
  // UI state
  currentStep: number
  completedSteps: Set<number>
  isSubmitting: boolean
  
  // Results
  creationResult?: CreationResult
  error?: string
  
  // Metadata
  lastSaved: Date | null
  isDirty: boolean
}

interface WizardActions {
  // Data updates
  updateBusinessInfo: (data: Partial<BusinessInfo>) => void
  updateAssistantConfig: (data: Partial<AssistantConfig>) => void
  updateKnowledgeBase: (content: string) => void
  addQAPair: (pair: Omit<QAPair, 'id'>) => void
  updateQAPair: (id: string, updates: Partial<QAPair>) => void
  removeQAPair: (id: string) => void
  
  // Step management
  setCurrentStep: (step: number) => void
  markStepCompleted: (step: number) => void
  
  // Creation flow
  setSubmitting: (isSubmitting: boolean) => void
  setCreationResult: (result: CreationResult) => void
  setError: (error: string) => void
  
  // Utility
  markSaved: () => void
  markDirty: () => void
  reset: () => void
  canProceedToStep: (step: number) => boolean
  getFormData: () => {
    businessInfo: Partial<BusinessInfo>
    assistantConfig: Partial<AssistantConfig>
    knowledgeBase: string
    qaPairs: QAPair[]
  }
}

const initialState: WizardState = {
  businessInfo: {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hoursOfOperation: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '10:00', close: '16:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: true },
    }
  },
  assistantConfig: {
    language: 'en-US',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Default 11Labs voice
    personality: {
      tone: 'professional',
      traits: []
    }
  },
  knowledgeBase: '',
  qaPairs: [],
  currentStep: 1,
  completedSteps: new Set(),
  isSubmitting: false,
  lastSaved: null,
  isDirty: false,
}

export const useWizardStore = create<WizardState & WizardActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      updateBusinessInfo: (data) => {
        set((state) => ({
          businessInfo: { ...state.businessInfo, ...data },
          isDirty: true
        }))
      },
      
      updateAssistantConfig: (data) => {
        set((state) => ({
          assistantConfig: { ...state.assistantConfig, ...data },
          isDirty: true
        }))
      },
      
      updateKnowledgeBase: (content) => {
        set({ knowledgeBase: content, isDirty: true })
      },
      
      addQAPair: (pair) => {
        const newPair: QAPair = {
          ...pair,
          id: `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
        set((state) => ({
          qaPairs: [...state.qaPairs, newPair],
          isDirty: true
        }))
      },
      
      updateQAPair: (id, updates) => {
        set((state) => ({
          qaPairs: state.qaPairs.map(pair => 
            pair.id === id ? { ...pair, ...updates } : pair
          ),
          isDirty: true
        }))
      },
      
      removeQAPair: (id) => {
        set((state) => ({
          qaPairs: state.qaPairs.filter(pair => pair.id !== id),
          isDirty: true
        }))
      },
      
      setCurrentStep: (step) => {
        set({ currentStep: step })
      },
      
      markStepCompleted: (step) => {
        set((state) => ({
          completedSteps: new Set([...state.completedSteps, step])
        }))
      },
      
      setSubmitting: (isSubmitting) => {
        set({ isSubmitting })
      },
      
      setCreationResult: (result) => {
        set({ creationResult: result, error: undefined })
      },
      
      setError: (error) => {
        set({ error, isSubmitting: false })
      },
      
      markSaved: () => {
        set({ lastSaved: new Date(), isDirty: false })
      },
      
      markDirty: () => {
        set({ isDirty: true })
      },
      
      reset: () => {
        set(initialState)
      },
      
      canProceedToStep: (step: number) => {
        const state = get()
        
        switch (step) {
          case 1:
            return true
          case 2:
            return !!(state.assistantConfig.name && state.assistantConfig.persona && state.assistantConfig.transferPhoneNumber)
          case 3:
            return true // Knowledge base is optional
          case 4:
            return true // Q&A pairs are optional
          default:
            return false
        }
      },
      
      getFormData: () => {
        const state = get()
        return {
          businessInfo: state.businessInfo,
          assistantConfig: state.assistantConfig,
          knowledgeBase: state.knowledgeBase,
          qaPairs: state.qaPairs
        }
      }
    }),
    {
      name: 'wizard-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist form data, not UI state
      partialize: (state) => ({
        businessInfo: state.businessInfo,
        assistantConfig: state.assistantConfig,
        knowledgeBase: state.knowledgeBase,
        qaPairs: state.qaPairs,
        lastSaved: state.lastSaved
      }),
    }
  )
)

// Auto-save hook
import { useEffect } from 'react'

export const useAutoSave = () => {
  const markSaved = useWizardStore((state) => state.markSaved)
  const isDirty = useWizardStore((state) => state.isDirty)
  
  useEffect(() => {
    if (!isDirty) return
    
    const timer = setTimeout(() => {
      markSaved()
    }, 10000) // Auto-save every 10 seconds
    
    return () => clearTimeout(timer)
  }, [isDirty, markSaved])
}