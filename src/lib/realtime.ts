'use client'

import { createBrowserClient } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeCallUpdate {
  id: string
  status: 'active' | 'completed' | 'failed'
  duration?: number
  transcript?: string
  summary?: string
  lead_captured?: boolean
  created_at: string
  updated_at: string
}

export interface RealtimeSubscriptionCallbacks {
  onCallStarted?: (call: RealtimeCallUpdate) => void
  onCallUpdated?: (call: RealtimeCallUpdate) => void
  onCallEnded?: (call: RealtimeCallUpdate) => void
  onError?: (error: any) => void
}

class RealtimeManager {
  private supabase = createBrowserClient()
  private channels: Map<string, RealtimeChannel> = new Map()
  private userId: string | null = null

  async initialize() {
    const { data: { user } } = await this.supabase.auth.getUser()
    this.userId = user?.id || null
    return this.userId !== null
  }

  subscribeToUserCalls(callbacks: RealtimeSubscriptionCallbacks): () => void {
    if (!this.userId) {
      console.warn('Cannot subscribe to calls: User not authenticated')
      return () => {}
    }

    const channelName = `user-calls-${this.userId}`
    
    // Remove existing subscription if any
    this.unsubscribe(channelName)

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_logs',
          filter: `assistant_id=in.(select id from assistants where user_id=eq.${this.userId})`
        },
        (payload) => {
          console.log('New call started:', payload.new)
          callbacks.onCallStarted?.(payload.new as RealtimeCallUpdate)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_logs',
          filter: `assistant_id=in.(select id from assistants where user_id=eq.${this.userId})`
        },
        (payload) => {
          console.log('Call updated:', payload.new)
          const newCall = payload.new as RealtimeCallUpdate
          
          if (newCall.status === 'completed' || newCall.status === 'failed') {
            callbacks.onCallEnded?.(newCall)
          } else {
            callbacks.onCallUpdated?.(newCall)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for user calls')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error')
          callbacks.onError?.('Subscription failed')
        }
      })

    this.channels.set(channelName, channel)

    // Return unsubscribe function
    return () => this.unsubscribe(channelName)
  }

  subscribeToAnalytics(callbacks: {
    onMetricsUpdate?: (data: any) => void
    onError?: (error: any) => void
  }): () => void {
    if (!this.userId) {
      console.warn('Cannot subscribe to analytics: User not authenticated')
      return () => {}
    }

    const channelName = `user-analytics-${this.userId}`
    
    // Remove existing subscription if any
    this.unsubscribe(channelName)

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs',
          filter: `assistant_id=in.(select id from assistants where user_id=eq.${this.userId})`
        },
        (payload) => {
          console.log('Analytics data updated:', payload)
          // Trigger analytics refresh
          callbacks.onMetricsUpdate?.(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time analytics subscription active')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time analytics subscription error')
          callbacks.onError?.('Analytics subscription failed')
        }
      })

    this.channels.set(channelName, channel)

    return () => this.unsubscribe(channelName)
  }

  subscribeToAssistantStatus(callbacks: {
    onStatusChange?: (assistant: any) => void
    onError?: (error: any) => void
  }): () => void {
    if (!this.userId) {
      console.warn('Cannot subscribe to assistant status: User not authenticated')
      return () => {}
    }

    const channelName = `user-assistants-${this.userId}`
    
    this.unsubscribe(channelName)

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'assistants',
          filter: `user_id=eq.${this.userId}`
        },
        (payload) => {
          console.log('Assistant status changed:', payload.new)
          callbacks.onStatusChange?.(payload.new)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time assistant status subscription active')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time assistant status subscription error')
          callbacks.onError?.('Assistant subscription failed')
        }
      })

    this.channels.set(channelName, channel)

    return () => this.unsubscribe(channelName)
  }

  private unsubscribe(channelName: string) {
    const existingChannel = this.channels.get(channelName)
    if (existingChannel) {
      this.supabase.removeChannel(existingChannel)
      this.channels.delete(channelName)
      console.log(`🔌 Unsubscribed from ${channelName}`)
    }
  }

  unsubscribeAll() {
    this.channels.forEach((channel, channelName) => {
      this.supabase.removeChannel(channel)
      console.log(`🔌 Unsubscribed from ${channelName}`)
    })
    this.channels.clear()
  }

  // Helper method to get connection status
  getConnectionStatus(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
    // Supabase doesn't expose this directly, but we can infer from channels
    if (this.channels.size === 0) return 'CLOSED'
    
    // Check if any channel is subscribed
    const hasActiveChannels = Array.from(this.channels.values()).some(
      channel => (channel as any).state === 'joined'
    )
    
    return hasActiveChannels ? 'OPEN' : 'CONNECTING'
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager()

// React hook for easier usage
import { useEffect, useCallback, useState } from 'react'

export function useRealtimeCalls(callbacks: RealtimeSubscriptionCallbacks) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const setupSubscription = async () => {
      try {
        setError(null)
        const initialized = await realtimeManager.initialize()
        
        if (!initialized) {
          setError('Authentication required')
          return
        }

        unsubscribe = realtimeManager.subscribeToUserCalls({
          ...callbacks,
          onError: (err) => {
            setError(err)
            callbacks.onError?.(err)
          }
        })

        setIsConnected(true)
      } catch (err) {
        setError('Failed to setup real-time subscription')
        console.error('Real-time setup error:', err)
      }
    }

    setupSubscription()

    return () => {
      if (unsubscribe) {
        unsubscribe()
        setIsConnected(false)
      }
    }
  }, []) // Empty dependency array - only run once

  const reconnect = useCallback(async () => {
    setError(null)
    const initialized = await realtimeManager.initialize()
    if (initialized) {
      realtimeManager.subscribeToUserCalls(callbacks)
      setIsConnected(true)
    }
  }, [callbacks])

  return { isConnected, error, reconnect }
}

export function useRealtimeAnalytics(onUpdate: (data: any) => void) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const setupSubscription = async () => {
      try {
        setError(null)
        const initialized = await realtimeManager.initialize()
        
        if (!initialized) {
          setError('Authentication required')
          return
        }

        unsubscribe = realtimeManager.subscribeToAnalytics({
          onMetricsUpdate: onUpdate,
          onError: (err) => {
            setError(err)
          }
        })

        setIsConnected(true)
      } catch (err) {
        setError('Failed to setup analytics subscription')
        console.error('Analytics subscription error:', err)
      }
    }

    setupSubscription()

    return () => {
      if (unsubscribe) {
        unsubscribe()
        setIsConnected(false)
      }
    }
  }, [onUpdate])

  return { isConnected, error }
}