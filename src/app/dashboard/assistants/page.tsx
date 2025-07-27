'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRealtimeCalls } from '@/lib/realtime'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import Link from 'next/link'

interface Assistant {
  id: string
  name: string
  status: 'draft' | 'active' | 'inactive' | 'error'
  phone_number?: string
  vapi_assistant_id?: string
  created_at: string
  updated_at: string
  callCount?: number
  lastCallAt?: string
}

const StatusBadge = ({ status }: { status: Assistant['status'] }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return { color: 'bg-success-green/10 text-success-green', icon: '✅', label: 'Active' }
      case 'inactive':
        return { color: 'bg-text-secondary/10 text-text-secondary', icon: '⏸️', label: 'Inactive' }
      case 'draft':
        return { color: 'bg-warning-orange/10 text-warning-orange', icon: '📝', label: 'Draft' }
      case 'error':
        return { color: 'bg-error-red/10 text-error-red', icon: '❌', label: 'Error' }
      default:
        return { color: 'bg-text-secondary/10 text-text-secondary', icon: '❓', label: 'Unknown' }
    }
  }

  const config = getStatusConfig()
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

const AssistantCard = ({ 
  assistant, 
  onActivate, 
  onDeactivate, 
  onDelete, 
  index = 0,
  isLoading = false 
}: { 
  assistant: Assistant
  onActivate: (id: string) => void
  onDeactivate: (id: string) => void
  onDelete: (id: string) => void
  index?: number
  isLoading?: boolean
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const handleAction = async (action: string, callback: () => void) => {
    setActionLoading(action)
    await callback()
    setActionLoading(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`metric-card fade-in-up stagger-${index + 1} group ${assistant.status === 'active' ? 'glow-effect' : ''}`}>
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary-blue transition-colors duration-200">
                {assistant.name}
              </h3>
              <StatusBadge status={assistant.status} />
            </div>
            
            {assistant.phone_number && (
              <p className="text-text-secondary text-sm font-mono">
                📞 {assistant.phone_number}
              </p>
            )}
          </div>
          
          <div className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-300">
            🤖
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 py-3 border-t border-border-subtle">
          <div className="text-center">
            <p className="text-text-secondary text-xs font-medium mb-1">Total Calls</p>
            <AnimatedCounter 
              value={assistant.callCount || 0}
              className="text-lg font-bold text-text-primary"
            />
          </div>
          <div className="text-center">
            <p className="text-text-secondary text-xs font-medium mb-1">Created</p>
            <p className="text-sm text-text-primary">
              {formatDate(assistant.created_at).split(',')[0]}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          {assistant.status === 'draft' ? (
            <button
              onClick={() => handleAction('activate', () => onActivate(assistant.id))}
              disabled={actionLoading === 'activate' || isLoading}
              className="btn-primary flex-1 text-sm h-auto py-2"
            >
              {actionLoading === 'activate' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>🚀</span>
                  <span className="ml-1">Activate</span>
                </>
              )}
            </button>
          ) : assistant.status === 'active' ? (
            <button
              onClick={() => handleAction('deactivate', () => onDeactivate(assistant.id))}
              disabled={actionLoading === 'deactivate' || isLoading}
              className="btn-secondary flex-1 text-sm h-auto py-2"
            >
              {actionLoading === 'deactivate' ? (
                <div className="w-4 h-4 border-2 border-text-secondary/30 border-t-text-secondary rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>⏸️</span>
                  <span className="ml-1">Pause</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => handleAction('activate', () => onActivate(assistant.id))}
              disabled={actionLoading === 'activate' || isLoading}
              className="btn-primary flex-1 text-sm h-auto py-2"
            >
              {actionLoading === 'activate' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>▶️</span>
                  <span className="ml-1">Reactivate</span>
                </>
              )}
            </button>
          )}
          
          <Link 
            href={`/dashboard/assistants/${assistant.id}/edit`}
            className="btn-secondary text-sm h-auto py-2 px-3"
          >
            ✏️
          </Link>
          
          <button
            onClick={() => handleAction('delete', () => onDelete(assistant.id))}
            disabled={actionLoading === 'delete' || isLoading}
            className="btn-destructive text-sm h-auto py-2 px-3"
          >
            {actionLoading === 'delete' ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              '🗑️'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AssistantsPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createBrowserClient()

  // Real-time updates
  const { isConnected } = useRealtimeCalls({
    onCallStarted: (call) => {
      // Update call count for the assistant
      setAssistants(prev => prev.map(assistant => {
        if (assistant.vapi_assistant_id === call.id) {
          return {
            ...assistant,
            callCount: (assistant.callCount || 0) + 1,
            lastCallAt: new Date().toISOString()
          }
        }
        return assistant
      }))
    }
  })

  const fetchAssistants = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get assistants with call counts
      const { data: assistantsData, error: assistantsError } = await supabase
        .from('assistants')
        .select(`
          *,
          call_logs(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (assistantsError) {
        throw assistantsError
      }

      // Process the data to include call counts
      const processedAssistants = assistantsData?.map(assistant => ({
        ...assistant,
        callCount: assistant.call_logs?.[0]?.count || 0
      })) || []

      setAssistants(processedAssistants)
    } catch (err) {
      console.error('Error fetching assistants:', err)
      setError('Failed to load assistants')
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async (id: string) => {
    try {
      setActionLoading(true)
      const response = await fetch(`/api/assistants/${id}/activate`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to activate assistant')
      }

      // Refresh assistants list
      await fetchAssistants()
    } catch (err) {
      console.error('Error activating assistant:', err)
      setError(err instanceof Error ? err.message : 'Failed to activate assistant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      setActionLoading(true)
      // Update assistant status to inactive
      const { error } = await supabase
        .from('assistants')
        .update({ status: 'inactive' })
        .eq('id', id)

      if (error) throw error

      await fetchAssistants()
    } catch (err) {
      console.error('Error deactivating assistant:', err)
      setError('Failed to deactivate assistant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assistant? This action cannot be undone.')) {
      return
    }

    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchAssistants()
    } catch (err) {
      console.error('Error deleting assistant:', err)
      setError('Failed to delete assistant')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    fetchAssistants()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="fade-in-up">
          <h1 className="text-h1 text-text-primary mb-2">AI Assistants</h1>
          <p className="text-text-secondary mb-6">Manage your voice AI receptionists</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`skeleton rounded-12dp h-48 fade-in-up stagger-${i + 1}`}></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start fade-in-up">
        <div>
          <h1 className="text-h1 text-text-primary bg-gradient-to-r from-text-primary to-primary-blue bg-clip-text">
            AI Assistants
          </h1>
          <p className="text-text-secondary mt-2">
            Manage your voice AI receptionists and monitor their performance
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-bg-surface border border-border-subtle">
            <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isConnected ? 'bg-success-green live-indicator' : 'bg-error-red'}`}></div>
            <span className="text-xs text-text-secondary font-medium">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          
          <Link href="/dashboard/assistants/new" className="btn-primary">
            <span>✨</span>
            <span className="ml-2">Create Assistant</span>
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card bg-error-red/10 border-error-red/20 fade-in-up">
          <div className="flex items-center space-x-2">
            <span className="text-error-red">❌</span>
            <span className="text-error-red font-medium">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-error-red hover:text-error-red/70"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 fade-in-up-delay">
        <div className="metric-card">
          <div className="text-center">
            <p className="text-text-secondary text-sm font-medium mb-2">Total Assistants</p>
            <AnimatedCounter 
              value={assistants.length}
              className="text-h2 font-bold text-text-primary"
            />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="text-center">
            <p className="text-text-secondary text-sm font-medium mb-2">Active</p>
            <AnimatedCounter 
              value={assistants.filter(a => a.status === 'active').length}
              className="text-h2 font-bold text-success-green"
            />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="text-center">
            <p className="text-text-secondary text-sm font-medium mb-2">Draft</p>
            <AnimatedCounter 
              value={assistants.filter(a => a.status === 'draft').length}
              className="text-h2 font-bold text-warning-orange"
            />
          </div>
        </div>
        
        <div className="metric-card">
          <div className="text-center">
            <p className="text-text-secondary text-sm font-medium mb-2">Total Calls</p>
            <AnimatedCounter 
              value={assistants.reduce((sum, a) => sum + (a.callCount || 0), 0)}
              className="text-h2 font-bold text-primary-blue"
            />
          </div>
        </div>
      </div>

      {/* Assistants Grid */}
      {assistants.length === 0 ? (
        <div className="card text-center py-12 fade-in-up-delay-2">
          <div className="text-6xl mb-6 floating">🤖</div>
          <h3 className="text-h3 text-text-primary mb-4">No AI assistants yet</h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Create your first AI receptionist to start handling calls automatically. 
            It only takes a few minutes to set up!
          </p>
          <Link href="/dashboard/assistants/new" className="btn-primary group">
            <span className="group-hover:scale-110 transition-transform duration-200">✨</span>
            <span className="ml-2">Create Your First Assistant</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistants.map((assistant, index) => (
            <AssistantCard
              key={assistant.id}
              assistant={assistant}
              onActivate={handleActivate}
              onDeactivate={handleDeactivate}
              onDelete={handleDelete}
              index={index}
              isLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  )
}