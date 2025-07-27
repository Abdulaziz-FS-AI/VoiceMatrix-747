import { createServerComponentClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerComponentClient(cookieStore)
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const businessData = await request.json()
    
    // Since we're using simplified schema without businesses table,
    // we'll store business info in the user's profile metadata
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        business_info: {
          name: businessData.name,
          industry: businessData.industry,
          address: businessData.address,
          website: businessData.website,
          timezone: businessData.timezone,
          hours_of_operation: businessData.hoursOfOperation,
        }
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update business info' }, { status: 500 })
    }

    // Return a business-like object for compatibility
    return NextResponse.json({
      id: user.id, // Use user ID as business ID
      ...businessData,
      user_id: user.id
    })
  } catch (error) {
    console.error('Business creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}