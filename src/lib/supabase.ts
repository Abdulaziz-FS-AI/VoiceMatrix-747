import { createBrowserClient as createSupabaseBrowserClient, createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

// Updated database types to match our simplified schema
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'user' | 'admin'
          tier: 'free' | 'pro' | 'enterprise' | 'unlimited'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'user' | 'admin'
          tier?: 'free' | 'pro' | 'enterprise' | 'unlimited'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'user' | 'admin'
          tier?: 'free' | 'pro' | 'enterprise' | 'unlimited'
          created_at?: string
          updated_at?: string
        }
      }
      assistants: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          phone_number: string | null
          vapi_assistant_id: string | null
          status: 'active' | 'inactive' | 'configuring'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          phone_number?: string | null
          vapi_assistant_id?: string | null
          status?: 'active' | 'inactive' | 'configuring'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          phone_number?: string | null
          vapi_assistant_id?: string | null
          status?: 'active' | 'inactive' | 'configuring'
          created_at?: string
          updated_at?: string
        }
      }
      call_logs: {
        Row: {
          id: string
          assistant_id: string
          phone_number: string | null
          duration: number | null
          status: 'completed' | 'failed' | 'busy' | 'no-answer' | null
          vapi_call_id: string | null
          transcript: string | null
          summary: string | null
          lead_captured: boolean
          created_at: string
        }
        Insert: {
          id?: string
          assistant_id: string
          phone_number?: string | null
          duration?: number | null
          status?: 'completed' | 'failed' | 'busy' | 'no-answer' | null
          vapi_call_id?: string | null
          transcript?: string | null
          summary?: string | null
          lead_captured?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          assistant_id?: string
          phone_number?: string | null
          duration?: number | null
          status?: 'completed' | 'failed' | 'busy' | 'no-answer' | null
          vapi_call_id?: string | null
          transcript?: string | null
          summary?: string | null
          lead_captured?: boolean
          created_at?: string
        }
      }
      knowledge_base: {
        Row: {
          id: string
          assistant_id: string
          content: string
          embedding: number[] | null
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          assistant_id: string
          content: string
          embedding?: number[] | null
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          assistant_id?: string
          content?: string
          embedding?: number[] | null
          metadata?: any | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_knowledge_base: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
          assistant_uuid: string
        }
        Returns: {
          id: string
          content: string
          metadata: any
          similarity: number
        }[]
      }
      make_user_admin: {
        Args: {
          user_email: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Browser client for client-side operations
export function createBrowserClient() {
  return createSupabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Server client for API routes (simplified)
export function createServerComponentClient(cookieStore?: any) {
  // Import cookies only when needed to avoid build issues
  const { cookies } = require('next/headers')
  const finalCookieStore = cookieStore || cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return finalCookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              finalCookieStore.set(name, value, options)
            })
          } catch (error) {
            // Handle server component cookie setting errors
            console.warn('Failed to set cookies in server component:', error)
          }
        },
      },
    }
  )
}

// Middleware client for authentication checks
export function createMiddlewareClient(req: NextRequest, res: NextResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}

// Create client alias for backward compatibility
export const createClient = createBrowserClient