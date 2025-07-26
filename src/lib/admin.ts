import { createBrowserClient } from '@/lib/supabase'

export async function checkAdminStatus(userId: string) {
  const supabase = createBrowserClient()
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, tier, admin_privileges')
    .eq('id', userId)
    .single()
  
  if (error || !profile) {
    return { isAdmin: false, tier: 'free', privileges: {} }
  }
  
  return {
    isAdmin: profile.role === 'admin',
    tier: profile.tier || 'free',
    privileges: profile.admin_privileges || {}
  }
}

export function hasAdminAccess(userRole?: string, userTier?: string) {
  return userRole === 'admin' && userTier === 'admin_unlimited'
}

export function getAccessLimits(tier: string) {
  const limits = {
    free: {
      maxAssistants: 1,
      maxCallsPerMonth: 100,
      features: ['basic_assistant', 'basic_analytics']
    },
    pro: {
      maxAssistants: 5,
      maxCallsPerMonth: 1000,
      features: ['advanced_assistant', 'detailed_analytics', 'custom_prompts']
    },
    business: {
      maxAssistants: 20,
      maxCallsPerMonth: 5000,
      features: ['enterprise_assistant', 'full_analytics', 'api_access', 'priority_support']
    },
    admin_unlimited: {
      maxAssistants: Infinity,
      maxCallsPerMonth: Infinity,
      features: ['all_features', 'system_access', 'user_management', 'billing_control']
    }
  }
  
  return limits[tier as keyof typeof limits] || limits.free
}