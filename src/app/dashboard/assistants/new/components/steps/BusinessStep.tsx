'use client'

import { useState } from 'react'
import { useWizardStore } from '../../lib/wizard-store'

const INDUSTRIES = [
  'Restaurant & Food Service',
  'Healthcare & Medical',
  'Legal Services',
  'Real Estate',
  'Retail & E-commerce',
  'Professional Services',
  'Automotive',
  'Beauty & Wellness',
  'Education',
  'Technology',
  'Other'
]

const DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 
  'friday', 'saturday', 'sunday'
]

export function BusinessStep() {
  const { businessInfo, updateBusinessInfo, markStepCompleted } = useWizardStore()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    updateBusinessInfo({ [field]: value })
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    const currentHours = businessInfo.hoursOfOperation || {}
    updateBusinessInfo({
      hoursOfOperation: {
        ...currentHours,
        [day]: {
          ...currentHours[day],
          [field]: value
        }
      }
    })
  }

  const copyHoursToAll = (sourceDay: string) => {
    const sourceHours = businessInfo.hoursOfOperation?.[sourceDay]
    if (!sourceHours) return

    const newHours = Object.fromEntries(
      DAYS.map(day => [day, { ...sourceHours }])
    )
    
    updateBusinessInfo({ hoursOfOperation: newHours })
  }

  const validateAndProceed = () => {
    const newErrors: Record<string, string> = {}
    
    if (!businessInfo.name?.trim()) {
      newErrors.name = 'Business name is required'
    }
    
    if (!businessInfo.industry) {
      newErrors.industry = 'Please select an industry'
    }

    if (businessInfo.website && !isValidUrl(businessInfo.website)) {
      newErrors.website = 'Please enter a valid website URL'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      markStepCompleted(1)
      return true
    }
    
    return false
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Business Information
        </h2>
        <p className="text-gray-600">
          Tell us about your business so we can customize your AI assistant.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Name */}
        <div className="md:col-span-2">
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
            Business Name *
          </label>
          <input
            type="text"
            id="businessName"
            value={businessInfo.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your business name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Industry */}
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
            Industry *
          </label>
          <select
            id="industry"
            value={businessInfo.industry || ''}
            onChange={(e) => handleInputChange('industry', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.industry ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select your industry</option>
            {INDUSTRIES.map(industry => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
          {errors.industry && <p className="mt-1 text-sm text-red-600">{errors.industry}</p>}
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
            Timezone
          </label>
          <input
            type="text"
            id="timezone"
            value={businessInfo.timezone || ''}
            onChange={(e) => handleInputChange('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Auto-detected"
          />
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website (Optional)
          </label>
          <input
            type="text"
            id="website"
            value={businessInfo.website || ''}
            onChange={(e) => handleInputChange('website', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.website ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="https://yourwebsite.com"
          />
          {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website}</p>}
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address (Optional)
          </label>
          <input
            type="text"
            id="address"
            value={businessInfo.address || ''}
            onChange={(e) => handleInputChange('address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="123 Main St, City, State 12345"
          />
        </div>
      </div>

      {/* Hours of Operation */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Hours of Operation</h3>
        <div className="space-y-3">
          {DAYS.map(day => {
            const dayHours = businessInfo.hoursOfOperation?.[day]
            return (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-24">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {day}
                  </span>
                </div>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!dayHours?.closed}
                    onChange={(e) => handleHoursChange(day, 'closed', !e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Open</span>
                </label>

                {!dayHours?.closed && (
                  <>
                    <input
                      type="time"
                      value={dayHours?.open || '09:00'}
                      onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={dayHours?.close || '17:00'}
                      onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => copyHoursToAll(day)}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      Copy to all
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          onClick={validateAndProceed}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}