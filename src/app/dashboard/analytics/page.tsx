'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRealtimeAnalytics } from '@/lib/realtime'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface AnalyticsData {
  analytics: {
    totalCalls: number
    successRate: number
    averageDuration: number
    leadConversionRate: number
    uniqueCallers: number
    repeatCallerRate: number
    totalMinutes: number
    averageSentiment: number
    callQualityDistribution: { good: number; fair: number; poor: number }
    resolutionTypeBreakdown: Record<string, number>
    peakHour: number
    peakDay: number
    trends: {
      callsChange: number
      leadsChange: number
      durationChange: number
      successRateChange: number
    }
  }
  assistants: Array<{
    id: string
    name: string
    status: string
    callCount: number
    successRate: number
    averageDuration: number
    leadConversion: number
  }>
  insights: Array<{
    type: 'positive' | 'warning' | 'info'
    title: string
    description: string
    impact: 'high' | 'medium' | 'low'
    actionable: boolean
  }>
  trends: {
    callVolume: Array<{ timestamp: string; value: number }>
    leadConversion: Array<{ timestamp: string; value: number }>
    averageDuration: Array<{ timestamp: string; value: number }>
    hourlyDistribution: Array<{ hour: number; calls: number; leads: number }>
    dailyDistribution: Array<{ day: number; dayName: string; calls: number; leads: number }>
  }
  timeRange: string
  dateRange: { start: string; end: string }
}

const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon,
  trend,
  index = 0
}: { 
  title: string
  value: string | number
  change?: number
  icon: string
  trend?: 'up' | 'down' | 'neutral'
  index?: number
}) => {
  const getTrendColor = () => {
    if (!change) return 'text-text-secondary'
    if (change > 0) return 'text-success-green'
    if (change < 0) return 'text-error-red'
    return 'text-text-secondary'
  }

  const getTrendIcon = () => {
    if (!change) return ''
    if (change > 0) return '↗'
    if (change < 0) return '↘'
    return '→'
  }

  const isNumeric = typeof value === 'number'

  return (
    <div className={`metric-card fade-in-up stagger-${index + 1} hover-lift`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-text-secondary text-sm font-medium mb-1">{title}</p>
          <div className="text-h2 font-bold text-text-primary">
            {isNumeric ? (
              <AnimatedCounter value={value as number} />
            ) : (
              value
            )}
          </div>
          {change !== undefined && (
            <div className={`text-sm mt-2 flex items-center space-x-1 ${getTrendColor()}`}>
              <span className="text-lg">{getTrendIcon()}</span>
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div className="text-3xl opacity-80 group-hover:scale-110 transition-transform duration-200">
          {icon}
        </div>
      </div>
    </div>
  )
}

const InsightCard = ({ insight, index = 0 }: { insight: any; index?: number }) => {
  const getTypeIcon = () => {
    switch (insight.type) {
      case 'positive': return '✅'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📊'
    }
  }

  const getTypeColor = () => {
    switch (insight.type) {
      case 'positive': return 'border-success-green glow-green'
      case 'warning': return 'border-warning-orange glow-orange'
      case 'info': return 'border-primary-blue glow-blue'
      default: return 'border-border-subtle'
    }
  }

  return (
    <div className={`card border-l-4 ${getTypeColor()} fade-in-up stagger-${index + 1} hover-lift`}>
      <div className="flex items-start space-x-3">
        <span className="text-lg animate-pulse-scale">{getTypeIcon()}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-text-primary">{insight.title}</h4>
          <p className="text-text-secondary text-sm mt-1">{insight.description}</p>
          <div className="flex items-center mt-3 space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              insight.impact === 'high' ? 'bg-error-red/10 text-error-red' :
              insight.impact === 'medium' ? 'bg-warning-orange/10 text-warning-orange' :
              'bg-primary-blue/10 text-primary-blue'
            }`}>
              {insight.impact} impact
            </span>
            {insight.actionable && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-success-green/10 text-success-green">
                actionable
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedAssistant, setSelectedAssistant] = useState<string>('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const supabase = createBrowserClient()

  // Real-time analytics updates
  const { isConnected } = useRealtimeAnalytics((updateData) => {
    console.log('📊 Analytics data updated:', updateData)
    setLastUpdate(new Date())
    // Refetch analytics data when changes occur
    fetchAnalytics()
  })

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        timeRange,
        ...(selectedAssistant && { assistantId: selectedAssistant })
      })
      
      const response = await fetch(`/api/dashboard/analytics?${params}`)
      const analyticsData = await response.json()
      
      if (response.ok) {
        setData(analyticsData)
      } else {
        console.error('Analytics fetch error:', analyticsData.error)
      }
    } catch (error) {
      console.error('Analytics error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange, selectedAssistant])

  if (loading) {
    return (
      <div className="p-6">
        <div className="fade-in-up">
          <h1 className="text-h1 text-text-primary mb-2">Analytics Dashboard</h1>
          <p className="text-text-secondary mb-6">Loading comprehensive insights...</p>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`skeleton rounded-12dp h-24 fade-in-up stagger-${i + 1}`}></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`skeleton rounded-12dp h-80 fade-in-up stagger-${i + 1}`}></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-text-secondary">Unable to load analytics data.</p>
        </div>
      </div>
    )
  }

  const { analytics, assistants, insights, trends } = data

  // Prepare chart data
  const callVolumeData = trends.callVolume.map(item => ({
    time: new Date(item.timestamp).toLocaleDateString(),
    calls: item.value
  }))

  const leadConversionData = trends.leadConversion.map(item => ({
    time: new Date(item.timestamp).toLocaleDateString(),
    conversion: item.value
  }))

  const hourlyData = trends.hourlyDistribution.map(item => ({
    hour: `${item.hour}:00`,
    calls: item.calls,
    leads: item.leads
  }))

  const qualityData = Object.entries(analytics.callQualityDistribution).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
    color: key === 'good' ? '#10B981' : key === 'fair' ? '#F59E0B' : '#EF4444'
  }))

  const resolutionData = Object.entries(analytics.resolutionTypeBreakdown).map(([key, value]) => ({
    type: key.charAt(0).toUpperCase() + key.slice(1),
    count: value
  }))

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  return (
    <div className="p-6 space-y-6">
      {/* Header with Controls */}
      <div className="fade-in-up flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-h1 text-text-primary bg-gradient-to-r from-text-primary to-primary-blue bg-clip-text">
              Analytics Dashboard
            </h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full animate-pulse-scale ${isConnected ? 'bg-success-green' : 'bg-error-red'}`}></div>
              <span className="text-xs text-text-secondary">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          <p className="text-text-secondary mt-2">
            Comprehensive insights into your AI assistant performance
            {lastUpdate && (
              <span className="ml-2 text-xs">
                • Last updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex space-x-3 fade-in-up-delay">
          <select
            value={selectedAssistant}
            onChange={(e) => setSelectedAssistant(e.target.value)}
            className="input min-w-[160px]"
          >
            <option value="">All Assistants</option>
            {assistants.map(assistant => (
              <option key={assistant.id} value={assistant.id}>
                {assistant.name}
              </option>
            ))}
          </select>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Calls"
          value={analytics.totalCalls}
          change={analytics.trends.callsChange}
          icon="📞"
          index={0}
        />
        <MetricCard
          title="Success Rate"
          value={`${analytics.successRate}%`}
          change={analytics.trends.successRateChange}
          icon="✅"
          index={1}
        />
        <MetricCard
          title="Lead Conversion"
          value={`${analytics.leadConversionRate}%`}
          change={analytics.trends.leadsChange}
          icon="🎯"
          index={2}
        />
        <MetricCard
          title="Avg Duration"
          value={`${Math.floor(analytics.averageDuration / 60)}m ${analytics.averageDuration % 60}s`}
          change={analytics.trends.durationChange}
          icon="⏱️"
          index={3}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Volume Trend */}
        <div className="card fade-in-up-delay-2 hover-lift">
          <h3 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
            <span>📈</span>
            <span>Call Volume Trend</span>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={callVolumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="calls" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Conversion Trend */}
        <div className="card fade-in-up-delay-3 hover-lift">
          <h3 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
            <span>🎯</span>
            <span>Lead Conversion Rate</span>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={leadConversionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="conversion" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Distribution */}
        <div className="card fade-in-up-delay-4 hover-lift">
          <h3 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
            <span>🕐</span>
            <span>Hourly Call Distribution</span>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="hour" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Legend />
              <Bar dataKey="calls" fill="#3B82F6" name="Calls" />
              <Bar dataKey="leads" fill="#10B981" name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Call Quality Distribution */}
        <div className="card fade-in-up-delay-5 hover-lift">
          <h3 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
            <span>📊</span>
            <span>Call Quality Distribution</span>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={qualityData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
              >
                {qualityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights & Assistant Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Insights */}
        <div className="card fade-in-up-delay-6 hover-lift">
          <h3 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
            <span>🧠</span>
            <span>Smart Insights</span>
          </h3>
          {insights.length > 0 ? (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4 opacity-50">🧠</div>
              <p className="text-text-secondary">No insights available for this period.</p>
            </div>
          )}
        </div>

        {/* Assistant Performance */}
        <div className="card fade-in-up-delay-7 hover-lift">
          <h3 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
            <span>🤖</span>
            <span>Assistant Performance</span>
          </h3>
          <div className="space-y-4">
            {assistants.map((assistant, index) => (
              <div key={assistant.id} className={`p-4 bg-bg-dark rounded-8dp hover:bg-border-subtle/30 transition-colors duration-200 fade-in-up stagger-${index + 1}`}>
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-text-primary">{assistant.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    assistant.status === 'active' ? 'bg-success-green/10 text-success-green' : 
                    'bg-text-secondary/10 text-text-secondary'
                  }`}>
                    {assistant.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-text-secondary mb-1">Calls</p>
                    <p className="font-semibold text-text-primary text-lg">
                      <AnimatedCounter value={assistant.callCount} />
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary mb-1">Success Rate</p>
                    <p className="font-semibold text-text-primary text-lg">{assistant.successRate}%</p>
                  </div>
                  <div>
                    <p className="text-text-secondary mb-1">Avg Duration</p>
                    <p className="font-semibold text-text-primary">
                      {Math.floor(assistant.averageDuration / 60)}m {assistant.averageDuration % 60}s
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary mb-1">Lead Conv.</p>
                    <p className="font-semibold text-text-primary">{assistant.leadConversion}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card fade-in-up-delay-8 hover-lift">
          <h4 className="font-semibold text-text-primary mb-3 flex items-center space-x-2">
            <span>👥</span>
            <span>Customer Insights</span>
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Unique Callers</span>
              <span className="text-text-primary font-medium">
                <AnimatedCounter value={analytics.uniqueCallers} />
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Repeat Rate</span>
              <span className="text-text-primary font-medium">{analytics.repeatCallerRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Avg Sentiment</span>
              <span className={`font-medium ${
                analytics.averageSentiment > 0.3 ? 'text-success-green' :
                analytics.averageSentiment < -0.3 ? 'text-error-red' :
                'text-text-primary'
              }`}>
                {analytics.averageSentiment > 0 ? 'Positive' : 
                 analytics.averageSentiment < 0 ? 'Negative' : 'Neutral'}
              </span>
            </div>
          </div>
        </div>

        <div className="card fade-in-up-delay-9 hover-lift">
          <h4 className="font-semibold text-text-primary mb-3 flex items-center space-x-2">
            <span>📈</span>
            <span>Peak Activity</span>
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Peak Hour</span>
              <span className="text-text-primary font-medium">{analytics.peakHour}:00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Peak Day</span>
              <span className="text-text-primary font-medium">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][analytics.peakDay]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Total Minutes</span>
              <span className="text-text-primary font-medium">
                <AnimatedCounter value={analytics.totalMinutes} />
              </span>
            </div>
          </div>
        </div>

        <div className="card fade-in-up-delay-10 hover-lift">
          <h4 className="font-semibold text-text-primary mb-3 flex items-center space-x-2">
            <span>🏷️</span>
            <span>Resolution Types</span>
          </h4>
          <div className="space-y-2 text-sm">
            {Object.entries(analytics.resolutionTypeBreakdown).slice(0, 4).map(([type, count]) => (
              <div key={type} className="flex justify-between">
                <span className="text-text-secondary capitalize">{type}</span>
                <span className="text-text-primary font-medium">
                  <AnimatedCounter value={count as number} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}