import { createServerComponentClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirect') || '/dashboard'
  const planId = requestUrl.searchParams.get('plan')
  const billing = requestUrl.searchParams.get('billing')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerComponentClient(cookieStore)
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL('/auth/signin?error=callback_error', request.url))
      }

      if (data.user) {
        // User authenticated successfully 
        let finalRedirect = redirectTo
        
        // If coming from payment flow, include plan parameters
        if (planId && billing && redirectTo.includes('/checkout')) {
          finalRedirect = `${redirectTo}?plan=${planId}&billing=${billing}`
        }
        
        return NextResponse.redirect(new URL(finalRedirect, request.url))
      }
    } catch (error) {
      console.error('Unexpected auth error:', error)
      return NextResponse.redirect(new URL('/auth/signin?error=unexpected_error', request.url))
    }
  }

  // No code provided
  return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url))
}