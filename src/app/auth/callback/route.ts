import { createServerComponentClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirect') || '/dashboard'

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
        // Check if user has a business profile
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', data.user.id)
          .single()

        // If no business profile exists (OAuth signup), redirect to onboarding
        if (businessError || !business) {
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }

        // Redirect to intended destination
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }
    } catch (error) {
      console.error('Unexpected auth error:', error)
      return NextResponse.redirect(new URL('/auth/signin?error=unexpected_error', request.url))
    }
  }

  // No code provided
  return NextResponse.redirect(new URL('/auth/signin?error=no_code', request.url))
}