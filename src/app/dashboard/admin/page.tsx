'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { checkAdminStatus } from '@/lib/admin'
import { useRouter } from 'next/navigation'

interface UserData {
  id: string
  email: string
  role: string
  tier: string
  created_at: string
  business_name?: string
  total_assistants?: number
  total_calls?: number
}

export default function AdminPanel() {
  const [adminStatus, setAdminStatus] = useState({ isAdmin: false, tier: 'free', privileges: {} })
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAssistants: 0,
    totalCalls: 0,
    activeUsers: 0
  })
  
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/signin')
        return
      }

      const adminInfo = await checkAdminStatus(user.id)
      setAdminStatus(adminInfo)
      
      if (!adminInfo.isAdmin) {
        router.push('/dashboard')
        return
      }
      
      await loadAdminData()
      setLoading(false)
    }

    checkAccess()
  }, [supabase.auth, router])

  const loadAdminData = async () => {
    try {
      // Get all users with simplified query
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          role,
          tier,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('Error fetching users:', usersError)
        return
      }

      // Process the data with simplified structure
      const processedUsers = usersData?.map((user: any) => ({
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        tier: user.tier || 'free',
        created_at: user.created_at,
        business_name: 'Business',
        total_assistants: 0,
        total_calls: 0
      })) || []

      setUsers(processedUsers)

      // Calculate stats
      const totalUsers = processedUsers.length
      const totalAssistants = processedUsers.reduce((sum, user) => sum + (user.total_assistants || 0), 0)
      const totalCalls = processedUsers.reduce((sum, user) => sum + (user.total_calls || 0), 0)
      const activeUsers = processedUsers.filter(user => (user.total_assistants || 0) > 0).length

      setStats({
        totalUsers,
        totalAssistants,
        totalCalls,
        activeUsers
      })

    } catch (error) {
      console.error('Error loading admin data:', error)
    }
  }

  const makeUserAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          tier: 'admin_unlimited'
        })
        .eq('id', userId)

      if (error) throw error
      
      await loadAdminData()
      alert('User promoted to admin successfully!')
    } catch (error) {
      console.error('Error promoting user:', error)
      alert('Failed to promote user to admin')
    }
  }

  const removeAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'user',
          tier: 'free'
        })
        .eq('id', userId)

      if (error) throw error
      
      await loadAdminData()
      alert('Admin privileges removed successfully!')
    } catch (error) {
      console.error('Error removing admin:', error)
      alert('Failed to remove admin privileges')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-border-subtle rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-border-subtle rounded-12dp"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!adminStatus.isAdmin) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-h1 text-error-red mb-4">Access Denied</h1>
        <p className="text-text-secondary">You don't have admin privileges.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-text-primary flex items-center">
          <span className="text-2xl mr-3">👑</span>
          Admin Panel
        </h1>
        <p className="text-text-secondary mt-2">
          Manage users, monitor system activity, and oversee platform operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm font-medium">Total Users</p>
              <p className="text-h2 font-bold text-text-primary mt-1">{stats.totalUsers}</p>
            </div>
            <div className="text-2xl">👥</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm font-medium">Active Users</p>
              <p className="text-h2 font-bold text-text-primary mt-1">{stats.activeUsers}</p>
            </div>
            <div className="text-2xl">✅</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm font-medium">Total Assistants</p>
              <p className="text-h2 font-bold text-text-primary mt-1">{stats.totalAssistants}</p>
            </div>
            <div className="text-2xl">🤖</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm font-medium">Total Calls</p>
              <p className="text-h2 font-bold text-text-primary mt-1">{stats.totalCalls}</p>
            </div>
            <div className="text-2xl">📞</div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-h3 text-text-primary">User Management</h2>
          <button 
            onClick={loadAdminData}
            className="btn-secondary"
          >
            🔄 Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left py-3 px-4 text-text-secondary font-medium">User</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Business</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Tier</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Assistants</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Calls</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Joined</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border-subtle/50 hover:bg-bg-surface">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-text-primary font-medium flex items-center">
                        {user.email}
                        {user.role === 'admin' && (
                          <span className="ml-2 text-xs bg-primary-blue text-white px-2 py-1 rounded-full">
                            ADMIN
                          </span>
                        )}
                      </p>
                      <p className="text-text-secondary text-xs">{user.id.substring(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-text-secondary">{user.business_name}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.tier === 'admin_unlimited' ? 'bg-primary-blue text-white' :
                      user.tier === 'business' ? 'bg-success-green text-white' :
                      user.tier === 'pro' ? 'bg-accent-teal text-white' :
                      'bg-border-subtle text-text-secondary'
                    }`}>
                      {user.tier}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-text-primary">{user.total_assistants}</td>
                  <td className="py-3 px-4 text-text-primary">{user.total_calls}</td>
                  <td className="py-3 px-4 text-text-secondary">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      {user.role !== 'admin' ? (
                        <button
                          onClick={() => makeUserAdmin(user.id)}
                          className="text-xs bg-primary-blue text-white px-3 py-1 rounded-full hover:bg-indigo-light transition-colors"
                        >
                          Make Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => removeAdmin(user.id)}
                          className="text-xs bg-error-red text-white px-3 py-1 rounded-full hover:bg-red-600 transition-colors"
                        >
                          Remove Admin
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}