import { createServerComponentClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient(cookieStore)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '7d' // 1d, 7d, 30d, 90d
    const assistantId = searchParams.get('assistantId')

    // Get user's assistants
    const { data: assistants } = await supabase
      .from('assistants')
      .select('id, name, status, created_at')
      .eq('user_id', user.id)

    if (!assistants || assistants.length === 0) {
      return NextResponse.json({
        assistants: [],
        analytics: getEmptyAnalytics(),
        insights: [],
        trends: []
      })
    }

    const assistantIds = assistantId ? [assistantId] : assistants.map(a => a.id)

    // Get date boundaries based on time range
    const { startDate, endDate, previousStartDate } = getDateBoundaries(timeRange)

    // Get comprehensive call data
    const { data: allCalls } = await supabase
      .from('call_logs')
      .select('id, duration, status, lead_captured, created_at, phone_number, summary, transcript, metadata')
      .in('assistant_id', assistantIds)
      .gte('created_at', previousStartDate.toISOString())

    const calls = allCalls || []
    const currentPeriodCalls = calls.filter(call => new Date(call.created_at) >= startDate)
    const previousPeriodCalls = calls.filter(call => 
      new Date(call.created_at) >= previousStartDate && 
      new Date(call.created_at) < startDate
    )

    // Calculate comprehensive analytics
    const analytics = calculateAdvancedAnalytics(currentPeriodCalls, previousPeriodCalls)
    
    // Generate insights
    const insights = generateInsights(currentPeriodCalls, previousPeriodCalls, analytics)
    
    // Calculate trends for charts
    const trends = calculateTrends(calls, timeRange, startDate)
    
    // Performance by assistant
    const assistantPerformance = assistants.map(assistant => {
      const assistantCalls = currentPeriodCalls.filter(call => (call as any).assistant_id === assistant.id)
      return {
        id: assistant.id,
        name: assistant.name,
        status: assistant.status,
        callCount: assistantCalls.length,
        successRate: assistantCalls.length > 0 
          ? Math.round((assistantCalls.filter(c => c.status === 'completed').length / assistantCalls.length) * 100)
          : 0,
        averageDuration: assistantCalls.length > 0
          ? Math.round(assistantCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / assistantCalls.length)
          : 0,
        leadConversion: assistantCalls.length > 0
          ? Math.round((assistantCalls.filter(c => c.lead_captured).length / assistantCalls.length) * 100)
          : 0
      }
    })

    return NextResponse.json({
      assistants: assistantPerformance,
      analytics,
      insights,
      trends,
      timeRange,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getDateBoundaries(timeRange: string) {
  const now = new Date()
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  
  let startDate: Date
  let previousStartDate: Date
  
  switch (timeRange) {
    case '1d':
      startDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000))
      previousStartDate = new Date(startDate.getTime() - (24 * 60 * 60 * 1000))
      break
    case '7d':
      startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000))
      previousStartDate = new Date(startDate.getTime() - (7 * 24 * 60 * 60 * 1000))
      break
    case '30d':
      startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000))
      previousStartDate = new Date(startDate.getTime() - (30 * 24 * 60 * 60 * 1000))
      break
    case '90d':
      startDate = new Date(endDate.getTime() - (90 * 24 * 60 * 60 * 1000))
      previousStartDate = new Date(startDate.getTime() - (90 * 24 * 60 * 60 * 1000))
      break
    default:
      startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000))
      previousStartDate = new Date(startDate.getTime() - (7 * 24 * 60 * 60 * 1000))
  }
  
  return { startDate, endDate, previousStartDate }
}

function calculateAdvancedAnalytics(currentCalls: any[], previousCalls: any[]) {
  const current = {
    totalCalls: currentCalls.length,
    completedCalls: currentCalls.filter(c => c.status === 'completed').length,
    failedCalls: currentCalls.filter(c => c.status === 'failed').length,
    leadsGenerated: currentCalls.filter(c => c.lead_captured).length,
    totalDuration: currentCalls.reduce((sum, c) => sum + (c.duration || 0), 0),
    uniqueCallers: new Set(currentCalls.map(c => c.phone_number)).size
  }
  
  const previous = {
    totalCalls: previousCalls.length,
    completedCalls: previousCalls.filter(c => c.status === 'completed').length,
    leadsGenerated: previousCalls.filter(c => c.lead_captured).length,
    totalDuration: previousCalls.reduce((sum, c) => sum + (c.duration || 0), 0)
  }
  
  return {
    // Core metrics
    totalCalls: current.totalCalls,
    successRate: current.totalCalls > 0 ? Math.round((current.completedCalls / current.totalCalls) * 100) : 0,
    averageDuration: current.totalCalls > 0 ? Math.round(current.totalDuration / current.totalCalls) : 0,
    leadConversionRate: current.totalCalls > 0 ? Math.round((current.leadsGenerated / current.totalCalls) * 100) : 0,
    
    // Advanced metrics
    uniqueCallers: current.uniqueCallers,
    repeatCallerRate: current.totalCalls > 0 ? Math.round(((current.totalCalls - current.uniqueCallers) / current.totalCalls) * 100) : 0,
    totalMinutes: Math.round(current.totalDuration / 60),
    
    // Sentiment analysis (from metadata)
    averageSentiment: calculateAverageSentiment(currentCalls),
    callQualityDistribution: calculateCallQualityDistribution(currentCalls),
    resolutionTypeBreakdown: calculateResolutionBreakdown(currentCalls),
    
    // Peak performance
    peakHour: calculatePeakHour(currentCalls),
    peakDay: calculatePeakDay(currentCalls),
    
    // Period-over-period comparison
    trends: {
      callsChange: calculatePercentageChange(current.totalCalls, previous.totalCalls),
      leadsChange: calculatePercentageChange(current.leadsGenerated, previous.leadsGenerated),
      durationChange: calculatePercentageChange(current.totalDuration, previous.totalDuration),
      successRateChange: calculatePercentageChange(
        current.totalCalls > 0 ? (current.completedCalls / current.totalCalls) * 100 : 0,
        previous.totalCalls > 0 ? (previous.completedCalls / previous.totalCalls) * 100 : 0
      )
    }
  }
}

function calculateAverageSentiment(calls: any[]): number {
  const sentimentScores = calls
    .map(call => call.metadata?.sentimentScore)
    .filter(score => typeof score === 'number')
  
  return sentimentScores.length > 0
    ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length
    : 0
}

function calculateCallQualityDistribution(calls: any[]) {
  const distribution = { good: 0, fair: 0, poor: 0 }
  
  calls.forEach(call => {
    const quality = call.metadata?.callQuality || 'poor'
    if (quality in distribution) {
      distribution[quality as keyof typeof distribution]++
    }
  })
  
  return distribution
}

function calculateResolutionBreakdown(calls: any[]) {
  const breakdown: Record<string, number> = {}
  
  calls.forEach(call => {
    const resolutionType = call.metadata?.resolutionType || 'general'
    breakdown[resolutionType] = (breakdown[resolutionType] || 0) + 1
  })
  
  return breakdown
}

function calculatePeakHour(calls: any[]): number {
  const hourCounts: Record<number, number> = {}
  
  calls.forEach(call => {
    const hour = call.metadata?.timeOfDay || new Date(call.created_at).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })
  
  let peakHour = 0
  let maxCalls = 0
  
  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > maxCalls) {
      maxCalls = count
      peakHour = parseInt(hour)
    }
  })
  
  return peakHour
}

function calculatePeakDay(calls: any[]): number {
  const dayCounts: Record<number, number> = {}
  
  calls.forEach(call => {
    const day = call.metadata?.dayOfWeek || new Date(call.created_at).getDay()
    dayCounts[day] = (dayCounts[day] || 0) + 1
  })
  
  let peakDay = 0
  let maxCalls = 0
  
  Object.entries(dayCounts).forEach(([day, count]) => {
    if (count > maxCalls) {
      maxCalls = count
      peakDay = parseInt(day)
    }
  })
  
  return peakDay
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function generateInsights(currentCalls: any[], previousCalls: any[], analytics: any) {
  const insights = []
  
  // Performance insights
  if (analytics.trends.callsChange > 20) {
    insights.push({
      type: 'positive',
      title: 'Call Volume Surge',
      description: `Call volume increased by ${analytics.trends.callsChange}% compared to the previous period`,
      impact: 'high',
      actionable: true
    })
  }
  
  if (analytics.successRate < 70) {
    insights.push({
      type: 'warning',
      title: 'Low Success Rate',
      description: `Success rate is ${analytics.successRate}%, consider reviewing call handling procedures`,
      impact: 'high',
      actionable: true
    })
  }
  
  if (analytics.leadConversionRate > 15) {
    insights.push({
      type: 'positive',
      title: 'High Lead Conversion',
      description: `${analytics.leadConversionRate}% of calls resulted in leads - excellent performance!`,
      impact: 'medium',
      actionable: false
    })
  }
  
  if (analytics.averageSentiment < -0.3) {
    insights.push({
      type: 'warning',
      title: 'Negative Customer Sentiment',
      description: 'Recent calls show negative sentiment patterns, review call quality',
      impact: 'high',
      actionable: true
    })
  }
  
  if (analytics.repeatCallerRate > 30) {
    insights.push({
      type: 'info',
      title: 'High Repeat Caller Rate',
      description: `${analytics.repeatCallerRate}% of calls are from repeat customers`,
      impact: 'medium',
      actionable: false
    })
  }
  
  return insights
}

function calculateTrends(calls: any[], timeRange: string, startDate: Date) {
  const trends = {
    callVolume: [] as Array<{ timestamp: string; value: number }>,
    leadConversion: [] as Array<{ timestamp: string; value: number }>,
    averageDuration: [] as Array<{ timestamp: string; value: number }>,
    hourlyDistribution: [] as Array<{ hour: number; calls: number; leads: number }>,
    dailyDistribution: [] as Array<{ day: number; dayName: string; calls: number; leads: number }>
  }
  
  // Generate time series data based on time range
  const intervalHours = timeRange === '1d' ? 1 : timeRange === '7d' ? 24 : 24 * 7
  const intervals = timeRange === '1d' ? 24 : timeRange === '7d' ? 7 : 4
  
  for (let i = 0; i < intervals; i++) {
    const intervalStart = new Date(startDate.getTime() + (i * intervalHours * 60 * 60 * 1000))
    const intervalEnd = new Date(intervalStart.getTime() + (intervalHours * 60 * 60 * 1000))
    
    const intervalCalls = calls.filter(call => {
      const callDate = new Date(call.created_at)
      return callDate >= intervalStart && callDate < intervalEnd
    })
    
    trends.callVolume.push({
      timestamp: intervalStart.toISOString(),
      value: intervalCalls.length
    })
    
    trends.leadConversion.push({
      timestamp: intervalStart.toISOString(),
      value: intervalCalls.length > 0 
        ? Math.round((intervalCalls.filter(c => c.lead_captured).length / intervalCalls.length) * 100)
        : 0
    })
    
    trends.averageDuration.push({
      timestamp: intervalStart.toISOString(),
      value: intervalCalls.length > 0
        ? Math.round(intervalCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / intervalCalls.length)
        : 0
    })
  }
  
  // Hourly distribution (0-23)
  for (let hour = 0; hour < 24; hour++) {
    const hourCalls = calls.filter(call => {
      const callHour = call.metadata?.timeOfDay || new Date(call.created_at).getHours()
      return callHour === hour
    })
    
    trends.hourlyDistribution.push({
      hour,
      calls: hourCalls.length,
      leads: hourCalls.filter(c => c.lead_captured).length
    })
  }
  
  // Daily distribution (0=Sunday, 1=Monday, etc.)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  for (let day = 0; day < 7; day++) {
    const dayCalls = calls.filter(call => {
      const callDay = call.metadata?.dayOfWeek || new Date(call.created_at).getDay()
      return callDay === day
    })
    
    trends.dailyDistribution.push({
      day,
      dayName: dayNames[day],
      calls: dayCalls.length,
      leads: dayCalls.filter(c => c.lead_captured).length
    })
  }
  
  return trends
}

function getEmptyAnalytics() {
  return {
    totalCalls: 0,
    successRate: 0,
    averageDuration: 0,
    leadConversionRate: 0,
    uniqueCallers: 0,
    repeatCallerRate: 0,
    totalMinutes: 0,
    averageSentiment: 0,
    callQualityDistribution: { good: 0, fair: 0, poor: 0 },
    resolutionTypeBreakdown: {},
    peakHour: 9,
    peakDay: 1,
    trends: {
      callsChange: 0,
      leadsChange: 0,
      durationChange: 0,
      successRateChange: 0
    }
  }
}