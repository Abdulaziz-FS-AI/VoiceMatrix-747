'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { checkAdminStatus, hasAdminAccess } from '@/lib/admin'
import Image from 'next/image'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

// Import icons (we'll use emojis for now, can replace with lucide-react later)
const DashboardIcon = () => <span className="text-lg">📊</span>
const AssistantsIcon = () => <span className="text-lg">🤖</span>
const CallsIcon = () => <span className="text-lg">📞</span>
const AnalyticsIcon = () => <span className="text-lg">📈</span>
const BusinessIcon = () => <span className="text-lg">🏢</span>
const BillingIcon = () => <span className="text-lg">💳</span>
const SettingsIcon = () => <span className="text-lg">⚙️</span>
const AdminIcon = () => <span className="text-lg">👑</span>
const LogoutIcon = () => <span className="text-lg">🚪</span>

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType
  current?: boolean
  adminOnly?: boolean
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { name: 'Assistants', href: '/dashboard/assistants', icon: AssistantsIcon },
  { name: 'Call History', href: '/dashboard/calls', icon: CallsIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: AnalyticsIcon },
  { name: 'Business', href: '/dashboard/business', icon: BusinessIcon },
  { name: 'Billing', href: '/dashboard/billing', icon: BillingIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: SettingsIcon },
  { name: 'Admin Panel', href: '/dashboard/admin', icon: AdminIcon, adminOnly: true },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [adminStatus, setAdminStatus] = useState({ isAdmin: false, tier: 'free', privileges: {} })
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Auth check error:', error)
          router.push('/auth/signin')
          return
        }
        
        setUser(user)
        
        if (user) {
          const adminInfo = await checkAdminStatus(user.id)
          setAdminStatus(adminInfo)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Dashboard auth error:', error)
        router.push('/auth/signin')
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/auth/signin')
        } else if (event === 'SIGNED_IN') {
          setUser(session?.user || null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    )
  }

  if (!user) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-bg-dark">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-bg-surface border-r border-border-subtle transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b border-border-subtle">
            <Image
              src="/voice-matrix-logo.png"
              alt="Voice Matrix"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="ml-3 text-lg font-bold text-text-primary">Voice Matrix</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              // Hide admin-only items from non-admins
              if (item.adminOnly && !adminStatus.isAdmin) return null
              
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-8dp transition-colors hover:bg-border-subtle/50 text-text-secondary hover:text-text-primary group"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon />
                  <span className="ml-3">{item.name}</span>
                  {item.adminOnly && (
                    <span className="ml-auto text-xs bg-primary-blue text-white px-2 py-1 rounded-full">
                      ADMIN
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User menu */}
          <div className="px-4 py-4 border-t border-border-subtle">
            <div className="flex items-center px-3 py-2 mb-2">
              <div className="w-8 h-8 bg-primary-blue rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {user.email?.split('@')[0] || 'User'}
                  {adminStatus.isAdmin && (
                    <span className="ml-2 text-xs bg-primary-blue text-white px-2 py-1 rounded-full">
                      ADMIN
                    </span>
                  )}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {user.email} • {adminStatus.tier}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-8dp transition-colors hover:bg-error-red/10 text-text-secondary hover:text-error-red"
            >
              <LogoutIcon />
              <span className="ml-3">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-bg-dark/90 backdrop-blur-sm border-b border-border-subtle px-4 py-4 lg:px-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="lg:hidden p-2 rounded-8dp text-text-secondary hover:bg-border-subtle/50"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <span className="text-xl">☰</span>
            </button>

            <div className="flex items-center space-x-4">
              {/* Quick actions will go here */}
              <button className="btn-primary hidden sm:inline-flex">
                <span className="text-sm">🎯</span>
                <span className="ml-2">Create Assistant</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}