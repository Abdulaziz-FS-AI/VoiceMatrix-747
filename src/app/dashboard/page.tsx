'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRealtimeCalls } from '@/lib/realtime'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import Link from 'next/link'

// Enhanced metric card with animations
const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon,
  trend,
  index = 0,
  isLive = false
}: { 
  title: string
  value: string | number
  change?: string
  icon: string
  trend?: 'up' | 'down' | 'neutral'
  index?: number
  isLive?: boolean
}) => {
  const getTrendColor = () => {
    if (!change) return 'text-text-secondary'
    if (trend === 'up') return 'text-success-green'
    if (trend === 'down') return 'text-error-red'
    return 'text-text-secondary'
  }

  const getTrendIcon = () => {
    if (!change) return ''
    if (trend === 'up') return '↗'
    if (trend === 'down') return '↘'
    return '→'
  }

  const numericValue = typeof value === 'string' ? 
    parseInt(value.replace(/[^0-9]/g, '')) || 0 : value

  return (
    <div className={`metric-card fade-in-up stagger-${index + 1} ${isLive ? 'glow-effect' : ''} shadow-lg bg-gradient-to-br from-bg-surface/90 to-bg-surface/70 border border-border-subtle/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-text-secondary text-sm font-semibold mb-3 uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline space-x-3">
            {typeof value === 'number' ? (
              <AnimatedCounter 
                value={numericValue}
                className="text-h2 font-bold text-text-primary"
              />
            ) : (
              <p className="text-h2 font-bold text-text-primary">{value}</p>
            )}
            {isLive && (
              <div className="w-3 h-3 bg-success-green rounded-full live-indicator shadow-sm"></div>
            )}
          </div>
          {change && (
            <p className={`text-sm mt-3 flex items-center space-x-2 font-medium ${getTrendColor()}`}>
              <span className="text-base">{getTrendIcon()}</span>
              <span>{change}</span>
            </p>
          )}
        </div>
        <div className={`text-4xl opacity-70 group-hover:opacity-100 transition-all duration-300 ${isLive ? 'floating' : ''} drop-shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

const ActivityItem = ({ 
  time, 
  description, 
  type,
  index = 0
}: { 
  time: string
  description: string
  type: 'call' | 'lead' | 'system'
  index?: number
}) => {
  const icons = {
    call: '📞',
    lead: '🎯',
    system: '⚙️'
  }

  const getTypeColor = () => {
    switch (type) {
      case 'lead': return 'text-warning-orange'
      case 'call': return 'text-primary-blue'
      case 'system': return 'text-text-secondary'
      default: return 'text-text-secondary'
    }
  }

  return (
    <div className={`flex items-start space-x-3 py-3 border-b border-border-subtle last:border-0 fade-in-up stagger-${index + 1} hover:bg-bg-dark/50 transition-colors duration-200 rounded-8dp px-2 -mx-2`}>
      <div className="relative">
        <span className="text-lg">{icons[type]}</span>
        {type === 'lead' && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-warning-orange rounded-full pulse-scale"></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${getTypeColor()}`}>{description}</p>
        <p className="text-text-secondary text-xs mt-1">{time}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    callsToday: 0,
    leadsCapured: 0,
    responseTime: '0s',
    uptime: '0%'
  })
  const [assistants, setAssistants] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [liveCallCount, setLiveCallCount] = useState(0)

  const supabase = createBrowserClient()

  // Real-time call updates
  const { isConnected, error: realtimeError } = useRealtimeCalls({
    onCallStarted: (call) => {
      console.log('🔴 Live call started:', call)
      setLiveCallCount(prev => prev + 1)
      setRecentActivity(prev => [{
        id: call.id,
        time: 'Just now',
        description: `Call started from ${call.id}`,
        type: 'call' as const
      }, ...prev.slice(0, 9)])
    },
    onCallEnded: (call) => {
      console.log('✅ Call ended:', call)
      setLiveCallCount(prev => Math.max(0, prev - 1))
      setMetrics(prev => ({
        ...prev,
        callsToday: prev.callsToday + 1,
        leadsCapured: call.lead_captured ? prev.leadsCapured + 1 : prev.leadsCapured
      }))
      setRecentActivity(prev => [{
        id: call.id + '-end',
        time: 'Just now',
        description: `Call ${call.status} - ${call.duration ? Math.round(call.duration / 60) : 0}m`,
        type: call.lead_captured ? 'lead' as const : 'call' as const
      }, ...prev.slice(0, 9)])
    },
    onError: (error) => {
      console.error('Real-time error:', error)
    }
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          console.error('Auth error:', authError)
          return
        }

        // Get user's assistants (PROPERLY FILTERED BY USER)
        const { data: userAssistants, error: assistantsError } = await supabase
          .from('assistants')
          .select('*')
          .eq('user_id', user.id)

        if (assistantsError) {
          console.error('Error fetching assistants:', assistantsError)
        } else {
          setAssistants(userAssistants || [])
        }

        // Get today's calls (FILTERED BY USER'S ASSISTANTS)
        const today = new Date().toISOString().split('T')[0]
        const assistantIds = userAssistants?.map(a => a.id) || []
        
        let todaysCalls: any[] = []
        if (assistantIds.length > 0) {
          const { data: callsData, error: callsError } = await supabase
            .from('call_logs')
            .select('id, created_at, status')
            .gte('created_at', today)
            .in('assistant_id', assistantIds)
            
          if (!callsError) {
            todaysCalls = callsData || []
          }
        }

        setMetrics(prev => ({
          ...prev,
          callsToday: todaysCalls.length,
          leadsCapured: todaysCalls.filter(call => call.status === 'completed').length
        }))

        // Mock recent activity for now
        setRecentActivity([
          {
            id: 1,
            time: '2 minutes ago',
            description: 'New lead captured from +1-555-0123',
            type: 'lead' as const
          },
          {
            id: 2,
            time: '15 minutes ago', 
            description: 'Call completed successfully - 3m 45s',
            type: 'call' as const
          },
          {
            id: 3,
            time: '1 hour ago',
            description: 'Assistant "Restaurant Helper" went live',
            type: 'system' as const
          }
        ])

      } catch (error) {
        console.error('Dashboard data fetch error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [supabase])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-border-subtle rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-border-subtle rounded-12dp"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-bg-surface/30 to-bg-dark">
      {/* Elevated Header */}
      <div className="relative px-8 py-8 bg-gradient-to-r from-bg-surface/80 to-bg-surface/60 backdrop-blur-sm border-b border-border-subtle shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-blue/5 to-accent-teal/5"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="fade-in-up">
            <h1 className="text-3xl font-bold text-text-primary bg-gradient-to-r from-text-primary to-primary-blue bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-text-secondary text-base mt-2 font-medium">
              Monitor your AI receptionists and business performance
            </p>
          </div>
          
          {/* Elevated Status Indicators */}
          <div className="flex items-center space-x-4 fade-in-up-delay">
            {liveCallCount > 0 && (
              <div className="flex items-center space-x-2 px-4 py-3 bg-primary-blue/15 rounded-xl border border-primary-blue/30 shadow-lg backdrop-blur-sm">
                <div className="w-3 h-3 bg-primary-blue rounded-full live-indicator shadow-sm"></div>
                <span className="text-sm text-primary-blue font-semibold">
                  <AnimatedCounter value={liveCallCount} /> live call{liveCallCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-bg-surface/80 border border-border-subtle shadow-md backdrop-blur-sm">
              <div className={`w-3 h-3 rounded-full transition-colors duration-300 shadow-sm ${isConnected ? 'bg-success-green live-indicator' : 'bg-error-red'}`}></div>
              <span className="text-sm text-text-secondary font-semibold">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Elevated Main Content */}
      <div className="relative px-8 py-8 space-y-8">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/2 to-accent-teal/2 pointer-events-none"></div>
        <div className="relative z-10 space-y-8">

        {/* Elevated Quick Stats Section */}
        <section className="fade-in-up">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-text-primary flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <span>Overview</span>
            </h2>
            <Link 
              href="/dashboard/analytics" 
              className="px-4 py-2 bg-primary-blue/10 hover:bg-primary-blue/20 border border-primary-blue/30 rounded-lg text-primary-blue hover:text-primary-blue/80 font-semibold transition-all duration-200 flex items-center space-x-2 shadow-sm"
            >
              <span>View detailed analytics</span>
              <span className="transform group-hover:translate-x-1 transition-transform duration-200">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-8">
            <MetricCard
              title="Calls Today"
              value={metrics.callsToday}
              change="+12 from yesterday"
              trend="up"
              icon="📞"
              index={0}
              isLive={liveCallCount > 0}
            />
            <MetricCard
              title="Leads Captured"
              value={metrics.leadsCapured}
              change="+5 from yesterday"
              trend="up"
              icon="🎯"
              index={1}
            />
            <MetricCard
              title="Avg Response Time"
              value="2.1s"
              change="-0.3s from yesterday"
              trend="up"
              icon="⚡"
              index={2}
            />
            <MetricCard
              title="Assistant Uptime"
              value="99.8%"
              change="All systems active"
              trend="neutral"
              icon="✅"
              index={3}
              isLive={isConnected}
            />
          </div>
        </section>

        {/* Elevated Main Content Grid */}
        <div className="grid grid-cols-3 gap-8">
          {/* Elevated Recent Activity */}
          <section className="col-span-2 fade-in-up-delay-2">
              <div className="card shadow-xl bg-gradient-to-br from-bg-surface/90 to-bg-surface/70 border border-border-subtle/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-text-primary flex items-center space-x-3">
                    <span className="text-2xl">⚡</span>
                    <span>Recent Activity</span>
                    {recentActivity.length > 0 && (
                      <div className="w-3 h-3 bg-primary-blue rounded-full pulse-scale shadow-sm"></div>
                    )}
                  </h3>
                  <Link 
                    href="/dashboard/calls" 
                    className="px-4 py-2 bg-primary-blue/10 hover:bg-primary-blue/20 border border-primary-blue/30 rounded-lg text-primary-blue hover:text-primary-blue/80 font-semibold transition-all duration-200 flex items-center space-x-2 shadow-sm"
                  >
                    <span>View all</span>
                    <span className="transform group-hover:translate-x-1 transition-transform duration-200">→</span>
                  </Link>
                </div>
            <div className="space-y-0">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <ActivityItem
                    key={activity.id}
                    time={activity.time}
                    description={activity.description}
                    type={activity.type}
                    index={index}
                  />
                ))
              ) : (
                <div className="text-center py-8 fade-in-up">
                  <div className="text-4xl mb-4 opacity-50">📊</div>
                  <p className="text-text-secondary">No recent activity</p>
                  <p className="text-text-secondary text-sm mt-1">Activity will appear here as your assistants receive calls</p>
                </div>
              )}
            </div>
              </div>
            </section>

          {/* Elevated Sidebar */}
          <aside className="space-y-8 fade-in-up-delay-3">
              {/* Elevated Quick Actions Card */}
              <div className="card hover-lift shadow-xl bg-gradient-to-br from-bg-surface/90 to-bg-surface/70 border border-border-subtle/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-text-primary flex items-center space-x-3">
                    <span className="text-2xl">🚀</span>
                    <span>Quick Actions</span>
                  </h3>
                </div>
                <div className="space-y-3">
                  <Link href="/dashboard/assistants/new" className="btn-primary w-full group">
                    <span className="group-hover:scale-110 transition-transform duration-200">🎯</span>
                    <span className="ml-2">Create Assistant</span>
                  </Link>
                  <button className="btn-secondary w-full group">
                    <span className="group-hover:scale-110 transition-transform duration-200">📞</span>
                    <span className="ml-2">Test Call</span>
                  </button>
                  <Link href="/dashboard/analytics" className="btn-secondary w-full group">
                    <span className="group-hover:scale-110 transition-transform duration-200">📊</span>
                    <span className="ml-2">View Analytics</span>
                  </Link>
                </div>
              </div>

              {/* Elevated Assistant Status */}
              <div className="card hover-lift shadow-xl bg-gradient-to-br from-bg-surface/90 to-bg-surface/70 border border-border-subtle/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-text-primary flex items-center space-x-3">
                    <span className="text-2xl">🤖</span>
                    <span>Assistant Status</span>
                  </h3>
                </div>
            {assistants.length === 0 ? (
              <div className="text-center py-8 fade-in-up">
                <div className="text-4xl mb-4 floating">🤖</div>
                <p className="text-text-secondary mb-4">No assistants yet</p>
                <Link href="/dashboard/assistants/new" className="btn-primary group">
                  <span className="group-hover:scale-110 transition-transform duration-200">✨</span>
                  <span className="ml-2">Create Your First Assistant</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {assistants.slice(0, 3).map((assistant: any, index: number) => (
                  <div 
                    key={assistant.id} 
                    className={`flex items-center justify-between p-3 bg-bg-dark rounded-8dp hover:bg-border-subtle/30 transition-all duration-200 fade-in-up stagger-${index + 1} group`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-success-green rounded-full live-indicator"></div>
                      <span className="text-text-primary text-sm font-medium group-hover:text-primary-blue transition-colors duration-200">
                        {assistant.name}
                      </span>
                    </div>
                    <span className="text-text-secondary text-xs px-2 py-1 bg-success-green/10 text-success-green rounded-full">
                      {assistant.status}
                    </span>
                  </div>
                ))}
                {assistants.length > 3 && (
                  <p className="text-text-secondary text-sm text-center pt-2 fade-in-up-delay">
                    +{assistants.length - 3} more assistants
                  </p>
                )}
              </div>
            )}
            </div>
          </aside>
        </div>
        </div>
      </div>
    </div>
  )
}