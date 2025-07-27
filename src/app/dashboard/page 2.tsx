'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

// Temporary placeholder components - we'll build these properly
const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon 
}: { 
  title: string
  value: string | number
  change?: string
  icon: string 
}) => (
  <div className="card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-text-secondary text-sm font-medium">{title}</p>
        <p className="text-h2 font-bold text-text-primary mt-1">{value}</p>
        {change && (
          <p className="text-sm text-success-green mt-1">{change}</p>
        )}
      </div>
      <div className="text-2xl">{icon}</div>
    </div>
  </div>
)

const ActivityItem = ({ 
  time, 
  description, 
  type 
}: { 
  time: string
  description: string
  type: 'call' | 'lead' | 'system'
}) => {
  const icons = {
    call: '📞',
    lead: '🎯',
    system: '⚙️'
  }

  return (
    <div className="flex items-start space-x-3 py-3 border-b border-border-subtle last:border-0">
      <span className="text-lg">{icons[type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm">{description}</p>
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

  const supabase = createBrowserClient()

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-2">
          Monitor your AI receptionists and business performance
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Calls Today"
          value={metrics.callsToday}
          change="+12 from yesterday"
          icon="📞"
        />
        <MetricCard
          title="Leads Captured"
          value={metrics.leadsCapured}
          change="+5 from yesterday"
          icon="🎯"
        />
        <MetricCard
          title="Avg Response Time"
          value="2.1s"
          change="-0.3s from yesterday"
          icon="⚡"
        />
        <MetricCard
          title="Assistant Uptime"
          value="99.8%"
          change="All systems active"
          icon="✅"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-h3 text-text-primary">Recent Activity</h2>
              <button className="text-primary-blue hover:text-indigo-light text-sm">
                View all
              </button>
            </div>
            <div className="space-y-0">
              {recentActivity.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  time={activity.time}
                  description={activity.description}
                  type={activity.type}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="card">
            <h3 className="text-h3 text-text-primary mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="btn-primary w-full">
                <span>🎯</span>
                <span className="ml-2">Create Assistant</span>
              </button>
              <button className="btn-secondary w-full">
                <span>📞</span>
                <span className="ml-2">Test Call</span>
              </button>
              <button className="btn-secondary w-full">
                <span>📊</span>
                <span className="ml-2">View Analytics</span>
              </button>
            </div>
          </div>

          {/* Assistant Status */}
          <div className="card">
            <h3 className="text-h3 text-text-primary mb-4">Assistant Status</h3>
            {assistants.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🤖</div>
                <p className="text-text-secondary mb-4">No assistants yet</p>
                <button className="btn-primary">
                  Create Your First Assistant
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {assistants.slice(0, 3).map((assistant: any) => (
                  <div key={assistant.id} className="flex items-center justify-between p-3 bg-bg-dark rounded-8dp">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-success-green rounded-full"></div>
                      <span className="text-text-primary text-sm">{assistant.name}</span>
                    </div>
                    <span className="text-text-secondary text-xs">{assistant.status}</span>
                  </div>
                ))}
                {assistants.length > 3 && (
                  <p className="text-text-secondary text-sm text-center pt-2">
                    +{assistants.length - 3} more assistants
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}