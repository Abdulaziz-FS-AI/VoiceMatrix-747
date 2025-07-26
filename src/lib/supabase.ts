import { createBrowserClient as createSupabaseBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      businesses: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string | null
          website: string | null
          hours_of_operation: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address?: string | null
          website?: string | null
          hours_of_operation?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string | null
          website?: string | null
          hours_of_operation?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      assistants: {
        Row: {
          id: string
          business_id: string
          name: string
          persona: 'restaurant' | 'sales' | 'medical' | 'legal' | 'general'
          transfer_phone_number: string
          vapi_assistant_id: string | null
          vapi_phone_number_id: string | null
          status: 'pending' | 'configuring' | 'active' | 'paused' | 'error'
          configuration: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          persona: 'restaurant' | 'sales' | 'medical' | 'legal' | 'general'
          transfer_phone_number: string
          vapi_assistant_id?: string | null
          vapi_phone_number_id?: string | null
          status?: 'pending' | 'configuring' | 'active' | 'paused' | 'error'
          configuration?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          persona?: 'restaurant' | 'sales' | 'medical' | 'legal' | 'general'
          transfer_phone_number?: string
          vapi_assistant_id?: string | null
          vapi_phone_number_id?: string | null
          status?: 'pending' | 'configuring' | 'active' | 'paused' | 'error'
          configuration?: any
          created_at?: string
          updated_at?: string
        }
      }
      knowledge_bases: {
        Row: {
          id: string
          assistant_id: string
          content: string | null
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assistant_id: string
          content?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assistant_id?: string
          content?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      qa_pairs: {
        Row: {
          id: string
          assistant_id: string
          question: string
          answer: string
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assistant_id: string
          question: string
          answer: string
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assistant_id?: string
          question?: string
          answer?: string
          priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      call_logs: {
        Row: {
          id: string
          assistant_id: string
          caller_number: string | null
          start_time: string
          end_time: string | null
          duration_seconds: number | null
          transcript: any | null
          summary: string | null
          vapi_call_id: string | null
          status: 'active' | 'completed' | 'failed' | 'transferred'
          created_at: string
        }
        Insert: {
          id?: string
          assistant_id: string
          caller_number?: string | null
          start_time: string
          end_time?: string | null
          duration_seconds?: number | null
          transcript?: any | null
          summary?: string | null
          vapi_call_id?: string | null
          status?: 'active' | 'completed' | 'failed' | 'transferred'
          created_at?: string
        }
        Update: {
          id?: string
          assistant_id?: string
          caller_number?: string | null
          start_time?: string
          end_time?: string | null
          duration_seconds?: number | null
          transcript?: any | null
          summary?: string | null
          vapi_call_id?: string | null
          status?: 'active' | 'completed' | 'failed' | 'transferred'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_knowledge_chunks: {
        Args: {
          assistant_id: string
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          content: string
          metadata: any
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Client-side Supabase client
export function createClient() {
  return createSupabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Alias for compatibility  
export { createClient as createBrowserClient }

// Server-side Supabase client for API routes
export function createServerComponentClient(cookieStore?: any) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll() || []
        },
        setAll(cookiesToSet) {
          if (cookieStore) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // Ignore errors in server components
            }
          }
        },
      },
    }
  )
}

// Middleware Supabase client
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