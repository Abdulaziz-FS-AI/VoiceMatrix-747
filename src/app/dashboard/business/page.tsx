'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

interface BusinessInfo {
  name: string
  address: string
  website: string
  phone: string
  email: string
  description: string
  hours_of_operation: {
    [key: string]: { open: string; close: string; closed?: boolean }
  }
}

interface Profile {
  id: string
  business_info: BusinessInfo | null
  updated_at: string
}

const daysOfWeek = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]

const dayLabels = {
  monday: 'Monday',
  tuesday: 'Tuesday', 
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
}

export default function BusinessPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: '',
    address: '',
    website: '',
    phone: '',
    email: '',
    description: '',
    hours_of_operation: {}
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createBrowserClient()

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }

      if (profileData) {
        setProfile(profileData)
        if (profileData.business_info) {
          setBusinessInfo({
            ...profileData.business_info,
            hours_of_operation: profileData.business_info.hours_of_operation || {}
          })
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load business information')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          business_info: businessInfo,
          updated_at: new Date().toISOString()
        })

      if (updateError) throw updateError

      setSuccess('Business information saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
      await fetchProfile()
    } catch (err) {
      console.error('Error saving business info:', err)
      setError('Failed to save business information')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof BusinessInfo, value: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setBusinessInfo(prev => ({
      ...prev,
      hours_of_operation: {
        ...prev.hours_of_operation,
        [day]: {
          ...prev.hours_of_operation[day],
          [field]: value
        }
      }
    }))
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="fade-in-up">
          <h1 className="text-h1 text-text-primary mb-2">Business Profile</h1>
          <p className="text-text-secondary mb-6">Manage your business information and settings</p>
        </div>
        
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`skeleton rounded-12dp h-32 fade-in-up stagger-${i + 1}`}></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="fade-in-up">
        <h1 className="text-h1 text-text-primary bg-gradient-to-r from-text-primary to-primary-blue bg-clip-text">
          Business Profile
        </h1>
        <p className="text-text-secondary mt-2">
          Manage your business information and operating hours
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="card bg-error-red/10 border-error-red/20 fade-in-up">
          <div className="flex items-center space-x-2">
            <span className="text-error-red">❌</span>
            <span className="text-error-red font-medium">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-error-red hover:text-error-red/70"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="card bg-success-green/10 border-success-green/20 fade-in-up">
          <div className="flex items-center space-x-2">
            <span className="text-success-green">✅</span>
            <span className="text-success-green font-medium">{success}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="card fade-in-up-delay">
            <h2 className="text-h3 text-text-primary mb-6 flex items-center space-x-2">
              <span>📋</span>
              <span>Basic Information</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={businessInfo.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Your Business Name"
                  className="input w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={businessInfo.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={businessInfo.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="business@example.com"
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={businessInfo.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="input w-full"
                />
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-text-primary mb-2">
                Business Address
              </label>
              <input
                type="text"
                value={businessInfo.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="123 Main St, City, State 12345"
                className="input w-full"
              />
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-text-primary mb-2">
                Business Description
              </label>
              <textarea
                value={businessInfo.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your business and services..."
                rows={4}
                className="input w-full resize-none"
              />
            </div>
          </div>

          {/* Operating Hours */}
          <div className="card fade-in-up-delay-2">
            <h2 className="text-h3 text-text-primary mb-6 flex items-center space-x-2">
              <span>🕒</span>
              <span>Operating Hours</span>
            </h2>
            
            <div className="space-y-4">
              {daysOfWeek.map((day) => {
                const dayHours = businessInfo.hours_of_operation[day] || { open: '09:00', close: '17:00', closed: false }
                
                return (
                  <div key={day} className="flex items-center space-x-4 p-4 bg-bg-dark rounded-8dp">
                    <div className="w-20">
                      <span className="text-sm font-medium text-text-primary">
                        {dayLabels[day as keyof typeof dayLabels]}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!dayHours.closed}
                        onChange={(e) => handleHoursChange(day, 'closed', !e.target.checked)}
                        className="rounded border-border-subtle text-primary-blue focus:ring-primary-blue focus:ring-offset-0"
                      />
                      <span className="text-sm text-text-secondary">Open</span>
                    </div>
                    
                    {!dayHours.closed && (
                      <>
                        <input
                          type="time"
                          value={dayHours.open}
                          onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                          className="input text-sm"
                        />
                        <span className="text-text-secondary">to</span>
                        <input
                          type="time"
                          value={dayHours.close}
                          onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                          className="input text-sm"
                        />
                      </>
                    )}
                    
                    {dayHours.closed && (
                      <span className="text-text-secondary text-sm italic">Closed</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Save Action */}
          <div className="card fade-in-up-delay-3">
            <h3 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
              <span>💾</span>
              <span>Save Changes</span>
            </h3>
            
            <button
              onClick={handleSave}
              disabled={saving || !businessInfo.name.trim()}
              className="btn-primary w-full"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="ml-2">Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span className="ml-2">Save Business Info</span>
                </>
              )}
            </button>
            
            <p className="text-xs text-text-secondary mt-2">
              This information will be used by your AI assistants to provide accurate business details to callers.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="card fade-in-up-delay-4">
            <h3 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
              <span>📊</span>
              <span>Profile Status</span>
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">Profile Completion</span>
                <span className="text-sm font-medium text-text-primary">
                  <AnimatedCounter 
                    value={Math.round(
                      (Object.values(businessInfo).filter(v => v && v.toString().trim()).length / 7) * 100
                    )}
                    suffix="%"
                  />
                </span>
              </div>
              
              <div className="w-full bg-border-subtle rounded-full h-2">
                <div 
                  className="bg-primary-blue h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.round(
                      (Object.values(businessInfo).filter(v => v && v.toString().trim()).length / 7) * 100
                    )}%` 
                  }}
                ></div>
              </div>
              
              <div className="text-xs text-text-secondary">
                Complete your profile to help AI assistants provide better customer service.
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="card fade-in-up-delay-5">
            <h3 className="text-h3 text-text-primary mb-4 flex items-center space-x-2">
              <span>💡</span>
              <span>Tips</span>
            </h3>
            
            <div className="space-y-3 text-sm text-text-secondary">
              <div className="flex items-start space-x-2">
                <span className="text-primary-blue">•</span>
                <span>Keep your business hours up to date for accurate customer information</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-primary-blue">•</span>
                <span>A detailed description helps AI assistants answer customer questions</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-primary-blue">•</span>
                <span>Complete contact information builds customer trust</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}