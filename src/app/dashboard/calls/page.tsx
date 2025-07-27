'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRealtimeCalls } from '@/lib/realtime'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

interface CallLog {
  id: string
  assistantId: string
  assistantName: string
  phoneNumber: string
  duration: number
  status: string
  transcript: string | null
  summary: string | null
  leadCaptured: boolean
  createdAt: string
}

interface CallFilters {
  status: string
  assistant: string
  leadOnly: boolean
  dateRange: string
}

const CallStatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-success-green/10 text-success-green'
      case 'failed': return 'bg-error-red/10 text-error-red'
      case 'active': return 'bg-primary-blue/10 text-primary-blue'
      default: return 'bg-text-secondary/10 text-text-secondary'
    }
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor()}`}>
      {status}
    </span>
  )
}

const CallCard = ({ call, index = 0 }: { call: CallLog; index?: number }) => {
  const [expanded, setExpanded] = useState(false)
  
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`card fade-in-up stagger-${index + 1} hover-lift`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="font-semibold text-text-primary">
              {call.phoneNumber || 'Unknown Number'}
            </h3>
            <CallStatusBadge status={call.status} />
            {call.leadCaptured && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-warning-orange/10 text-warning-orange animate-pulse-scale">
                🎯 Lead
              </span>
            )}
          </div>
          
          <div className="text-sm text-text-secondary space-y-1">
            <p>Assistant: {call.assistantName}</p>
            <p>Duration: {formatDuration(call.duration || 0)}</p>
            <p>Date: {formatDate(call.createdAt)}</p>
          </div>

          {call.summary && (
            <div className="mt-3 p-3 bg-bg-dark rounded-8dp">
              <p className="text-sm text-text-primary font-medium mb-1">Summary</p>
              <p className="text-sm text-text-secondary">{call.summary}</p>
            </div>
          )}

          {call.transcript && (
            <div className="mt-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-primary-blue hover:text-indigo-light transition-colors duration-200 flex items-center space-x-1"
              >
                <span>{expanded ? '📄' : '📋'}</span>
                <span>{expanded ? 'Hide' : 'Show'} Transcript</span>
              </button>
              
              {expanded && (
                <div className="mt-2 p-3 bg-bg-dark rounded-8dp max-h-48 overflow-y-auto fade-in-up">
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">
                    {typeof call.transcript === 'string' 
                      ? call.transcript 
                      : JSON.stringify(call.transcript, null, 2)
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end space-y-2 ml-4">
          <div className={`text-3xl ${call.status === 'active' ? 'animate-spin' : call.status === 'completed' ? 'animate-pulse-scale' : ''}`}>
            {call.status === 'completed' ? '✅' : 
             call.status === 'failed' ? '❌' : 
             call.status === 'active' ? '🔄' : '📞'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [assistants, setAssistants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<CallFilters>({
    status: 'all',
    assistant: 'all',
    leadOnly: false,
    dateRange: '7d'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  })

  const supabase = createBrowserClient()

  // Real-time call updates
  const { isConnected } = useRealtimeCalls({
    onCallStarted: (call) => {
      // Add new call to top of list if it matches current filters
      setCalls(prev => [call as any, ...prev.slice(0, pagination.limit - 1)])
      setPagination(prev => ({ ...prev, total: prev.total + 1 }))
    },
    onCallEnded: (call) => {
      // Update existing call or add if not present
      setCalls(prev => {
        const existingIndex = prev.findIndex(c => c.id === call.id)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = { ...updated[existingIndex], ...call } as any
          return updated
        }
        return [call as any, ...prev.slice(0, pagination.limit - 1)]
      })
    }
  })

  const fetchCalls = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        dateRange: filters.dateRange,
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.assistant !== 'all' && { assistantId: filters.assistant }),
        ...(filters.leadOnly && { leadOnly: 'true' })
      })

      console.log('Fetching calls with params:', params.toString())
      
      const response = await fetch(`/api/call-logs?${params}`)
      const data = await response.json()

      console.log('API response:', data)

      if (response.ok) {
        setCalls(data.callLogs || [])
        setPagination(prev => ({
          ...prev,
          total: data.totalCount || 0
        }))
      } else {
        console.error('Failed to fetch call logs:', data.error, data.details)
        // Show error to user
        alert(`Failed to fetch call logs: ${data.error}${data.details ? ` - ${data.details}` : ''}`)
      }
    } catch (error) {
      console.error('Call logs fetch error:', error)
      alert('Network error while fetching call logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchAssistants = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: assistantsData } = await supabase
        .from('assistants')
        .select('id, name')
        .eq('user_id', user.id)

      console.log('Fetched assistants:', assistantsData)
      setAssistants(assistantsData || [])
    } catch (error) {
      console.error('Failed to fetch assistants:', error)
    }
  }

  const createTestCallLog = async () => {
    try {
      const response = await fetch('/api/test-call-logs', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        console.log('Created test calls:', data)
        alert(data.message)
        fetchCalls() // Refresh the list
      } else {
        console.error('Failed to create test calls:', data.error)
        alert(`Failed to create test calls: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating test calls:', error)
      alert('Error creating test calls')
    }
  }

  useEffect(() => {
    fetchAssistants()
  }, [])

  useEffect(() => {
    fetchCalls()
  }, [filters, pagination.page])

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="fade-in-up flex justify-between items-start">
        <div>
          <h1 className="text-h1 text-text-primary bg-gradient-to-r from-text-primary to-primary-blue bg-clip-text">
            Call History
          </h1>
          <p className="text-text-secondary mt-2">
            View and analyze all your assistant calls
          </p>
        </div>
        
        <div className="flex items-center space-x-2 fade-in-up-delay">
          <div className={`w-2 h-2 rounded-full animate-pulse-scale ${isConnected ? 'bg-success-green' : 'bg-error-red'}`}></div>
          <span className="text-xs text-text-secondary">
            {isConnected ? 'Live updates' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="card fade-in-up-delay-2 hover-lift">
        <h3 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
          <span>🔍</span>
          <span>Filters</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="input"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="active">Active</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Assistant
            </label>
            <select
              value={filters.assistant}
              onChange={(e) => setFilters(prev => ({ ...prev, assistant: e.target.value }))}
              className="input"
            >
              <option value="all">All Assistants</option>
              {assistants.map(assistant => (
                <option key={assistant.id} value={assistant.id}>
                  {assistant.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="input"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.leadOnly}
                onChange={(e) => setFilters(prev => ({ ...prev, leadOnly: e.target.checked }))}
                className="rounded border-border-subtle text-primary-blue focus:ring-primary-blue focus:ring-offset-0"
              />
              <span className="text-sm text-text-primary">Leads only</span>
            </label>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            <AnimatedCounter value={pagination.total} /> total calls
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => fetchCalls()}
              className="btn-secondary hover:scale-105 transition-transform duration-200"
            >
              <span>🔄</span>
              <span className="ml-2">Refresh</span>
            </button>
            
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={createTestCallLog}
                className="btn-primary hover:scale-105 transition-transform duration-200"
              >
                <span>🧪</span>
                <span className="ml-2">Create Test Call</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Call List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`skeleton rounded-12dp h-20 fade-in-up stagger-${i + 1}`}></div>
          ))}
        </div>
      ) : calls.length === 0 ? (
        <div className="card text-center py-12 fade-in-up-delay-3">
          <div className="text-4xl mb-4 opacity-50">📞</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No calls found</h3>
          <p className="text-text-secondary mb-4">
            {filters.status !== 'all' || filters.assistant !== 'all' || filters.leadOnly
              ? 'Try adjusting your filters to see more results.'
              : 'Calls will appear here once your assistants start receiving them.'}
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-bg-dark rounded-8dp text-left">
              <h4 className="text-sm font-medium text-text-primary mb-2">🐛 Debug Info:</h4>
              <div className="text-xs text-text-secondary space-y-1">
                <p>• Total assistants: {assistants.length}</p>
                <p>• Filters: {JSON.stringify(filters)}</p>
                <p>• Pagination: {JSON.stringify(pagination)}</p>
                <p>• Check browser console for API logs</p>
              </div>
              <button
                onClick={createTestCallLog}
                className="btn-primary text-sm mt-3"
              >
                Create Test Call Log
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {calls.map((call, index) => (
              <CallCard key={call.id} call={call} index={index} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card fade-in-up-delay-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-text-secondary">
                  Page <AnimatedCounter value={pagination.page} /> of <AnimatedCounter value={totalPages} />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform duration-200"
                  >
                    <span>←</span>
                    <span className="ml-2">Previous</span>
                  </button>
                  
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
                    disabled={pagination.page === totalPages}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform duration-200"
                  >
                    <span>Next</span>
                    <span className="ml-2">→</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}