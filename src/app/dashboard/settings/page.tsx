'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface UserSettings {
  notifications: {
    email_alerts: boolean
    call_notifications: boolean
    weekly_reports: boolean
    system_updates: boolean
  }
  preferences: {
    timezone: string
    date_format: string
    theme: 'dark' | 'light' | 'auto'
    language: string
  }
  security: {
    two_factor_enabled: boolean
    login_alerts: boolean
    api_access: boolean
  }
  integrations: {
    webhook_url?: string
    api_key?: string
    slack_webhook?: string
  }
}

const defaultSettings: UserSettings = {
  notifications: {
    email_alerts: true,
    call_notifications: true,
    weekly_reports: false,
    system_updates: true
  },
  preferences: {
    timezone: 'America/New_York',
    date_format: 'MM/DD/YYYY',
    theme: 'dark',
    language: 'en'
  },
  security: {
    two_factor_enabled: false,
    login_alerts: true,
    api_access: false
  },
  integrations: {}
}

const ToggleSwitch = ({ 
  enabled, 
  onChange, 
  label,
  description 
}: { 
  enabled: boolean
  onChange: (enabled: boolean) => void
  label: string
  description?: string
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-bg-dark rounded-8dp hover:bg-border-subtle/30 transition-colors duration-200">
      <div className="flex-1">
        <h4 className="text-text-primary font-medium">{label}</h4>
        {description && (
          <p className="text-text-secondary text-sm mt-1">{description}</p>
        )}
      </div>
      
      <button
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
          ${enabled ? 'bg-primary-blue' : 'bg-border-subtle'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  )
}

const SettingsSection = ({ 
  title, 
  icon, 
  children 
}: { 
  title: string
  icon: string
  children: React.ReactNode
}) => {
  return (
    <div className="card fade-in-up">
      <h2 className="text-h3 text-text-primary mb-6 flex items-center space-x-2">
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)

  const supabase = createBrowserClient()

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }

      if (profile?.settings) {
        setSettings({ ...defaultSettings, ...profile.settings })
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          settings: settings,
          updated_at: new Date().toISOString()
        })

      if (updateError) throw updateError

      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateNotification = (key: keyof UserSettings['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }))
  }

  const updatePreference = (key: keyof UserSettings['preferences'], value: string) => {
    setSettings(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [key]: value }
    }))
  }

  const updateSecurity = (key: keyof UserSettings['security'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      security: { ...prev.security, [key]: value }
    }))
  }

  const updateIntegration = (key: keyof UserSettings['integrations'], value: string) => {
    setSettings(prev => ({
      ...prev,
      integrations: { ...prev.integrations, [key]: value }
    }))
  }

  const generateApiKey = () => {
    const apiKey = `vma_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    updateIntegration('api_key', apiKey)
    setApiKeyVisible(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess('Copied to clipboard!')
    setTimeout(() => setSuccess(null), 2000)
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="fade-in-up">
          <h1 className="text-h1 text-text-primary mb-2">Settings</h1>
          <p className="text-text-secondary mb-6">Manage your account preferences and configurations</p>
        </div>
        
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
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
          Settings
        </h1>
        <p className="text-text-secondary mt-2">
          Manage your account preferences and configurations
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Notifications */}
          <SettingsSection title="Notifications" icon="🔔">
            <ToggleSwitch
              enabled={settings.notifications.email_alerts}
              onChange={(value) => updateNotification('email_alerts', value)}
              label="Email Alerts"
              description="Receive important notifications via email"
            />
            <ToggleSwitch
              enabled={settings.notifications.call_notifications}
              onChange={(value) => updateNotification('call_notifications', value)}
              label="Call Notifications"
              description="Get notified when calls are received"
            />
            <ToggleSwitch
              enabled={settings.notifications.weekly_reports}
              onChange={(value) => updateNotification('weekly_reports', value)}
              label="Weekly Reports"
              description="Receive weekly analytics summaries"
            />
            <ToggleSwitch
              enabled={settings.notifications.system_updates}
              onChange={(value) => updateNotification('system_updates', value)}
              label="System Updates"
              description="Notifications about system maintenance and updates"
            />
          </SettingsSection>

          {/* Preferences */}
          <SettingsSection title="Preferences" icon="⚙️">
            <div className="p-4 bg-bg-dark rounded-8dp space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Timezone
                </label>
                <select
                  value={settings.preferences.timezone}
                  onChange={(e) => updatePreference('timezone', e.target.value)}
                  className="input w-full"
                >
                  <option value="America/New_York">Eastern Time (EST)</option>
                  <option value="America/Chicago">Central Time (CST)</option>
                  <option value="America/Denver">Mountain Time (MST)</option>
                  <option value="America/Los_Angeles">Pacific Time (PST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Date Format
                </label>
                <select
                  value={settings.preferences.date_format}
                  onChange={(e) => updatePreference('date_format', e.target.value)}
                  className="input w-full"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Theme
                </label>
                <select
                  value={settings.preferences.theme}
                  onChange={(e) => updatePreference('theme', e.target.value)}
                  className="input w-full"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          </SettingsSection>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Security */}
          <SettingsSection title="Security" icon="🔒">
            <ToggleSwitch
              enabled={settings.security.two_factor_enabled}
              onChange={(value) => updateSecurity('two_factor_enabled', value)}
              label="Two-Factor Authentication"
              description="Add an extra layer of security to your account"
            />
            <ToggleSwitch
              enabled={settings.security.login_alerts}
              onChange={(value) => updateSecurity('login_alerts', value)}
              label="Login Alerts"
              description="Get notified of new login attempts"
            />
            <ToggleSwitch
              enabled={settings.security.api_access}
              onChange={(value) => updateSecurity('api_access', value)}
              label="API Access"
              description="Allow third-party applications to access your data"
            />
          </SettingsSection>

          {/* Integrations */}
          <SettingsSection title="Integrations" icon="🔗">
            <div className="p-4 bg-bg-dark rounded-8dp space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={settings.integrations.webhook_url || ''}
                  onChange={(e) => updateIntegration('webhook_url', e.target.value)}
                  placeholder="https://your-app.com/webhook"
                  className="input w-full"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Receive real-time events at this URL
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  API Key
                </label>
                <div className="flex space-x-2">
                  <input
                    type={apiKeyVisible ? 'text' : 'password'}
                    value={settings.integrations.api_key || ''}
                    placeholder="Generate an API key"
                    className="input flex-1"
                    readOnly
                  />
                  {settings.integrations.api_key && (
                    <button
                      onClick={() => setApiKeyVisible(!apiKeyVisible)}
                      className="btn-secondary px-3"
                    >
                      {apiKeyVisible ? '🙈' : '👁️'}
                    </button>
                  )}
                  {settings.integrations.api_key && (
                    <button
                      onClick={() => copyToClipboard(settings.integrations.api_key!)}
                      className="btn-secondary px-3"
                    >
                      📋
                    </button>
                  )}
                </div>
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={generateApiKey}
                    className="btn-primary text-sm py-1 px-3"
                  >
                    Generate New Key
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Slack Webhook
                </label>
                <input
                  type="url"
                  value={settings.integrations.slack_webhook || ''}
                  onChange={(e) => updateIntegration('slack_webhook', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="input w-full"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Send notifications to your Slack channel
                </p>
              </div>
            </div>
          </SettingsSection>

          {/* Save Button */}
          <div className="card fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-text-primary font-medium">Save Changes</h3>
                <p className="text-text-secondary text-sm">
                  Your settings are automatically saved when you make changes
                </p>
              </div>
              
              <button
                onClick={saveSettings}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="ml-2">Saving...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span className="ml-2">Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}