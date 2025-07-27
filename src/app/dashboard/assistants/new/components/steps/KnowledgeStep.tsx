'use client'

import { useState, useRef } from 'react'
import { useWizardStore } from '../../lib/wizard-store'

export function KnowledgeStep() {
  const { knowledgeBase, updateKnowledgeBase, markStepCompleted } = useWizardStore()
  const [activeTab, setActiveTab] = useState<'text' | 'file' | 'url'>('text')
  const [isUploading, setIsUploading] = useState(false)
  const [urlToImport, setUrlToImport] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTextChange = (content: string) => {
    updateKnowledgeBase(content)
  }

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return
    
    setIsUploading(true)
    try {
      const file = files[0]
      const text = await file.text()
      updateKnowledgeBase(text)
    } catch (error) {
      console.error('Error reading file:', error)
      alert('Error reading file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUrlImport = async () => {
    if (!urlToImport.trim()) return
    
    setIsUploading(true)
    try {
      // This would typically call an API to scrape the URL
      // For now, we'll just show a placeholder
      alert('URL import will be implemented in the API integration phase')
    } catch (error) {
      console.error('Error importing URL:', error)
      alert('Error importing from URL. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleContinue = () => {
    markStepCompleted(2)
  }

  const generateSampleContent = () => {
    const sampleContent = `About Our Business:
We are a leading technology company that provides innovative solutions for businesses of all sizes.

Our Services:
- Software Development
- Cloud Migration
- Data Analytics
- IT Consulting

Business Hours:
Monday - Friday: 9:00 AM - 5:00 PM
Saturday: 10:00 AM - 3:00 PM
Sunday: Closed

Contact Information:
Phone: (555) 123-4567
Email: info@company.com

Frequently Asked Questions:
Q: What services do you offer?
A: We offer software development, cloud migration, data analytics, and IT consulting services.

Q: What are your business hours?
A: We're open Monday through Friday from 9 AM to 5 PM, and Saturday from 10 AM to 3 PM.`

    updateKnowledgeBase(sampleContent)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Knowledge Base
        </h2>
        <p className="text-gray-600">
          Add information about your business so your AI assistant can answer questions accurately.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'text', label: 'Text Input', icon: '📝' },
            { id: 'file', label: 'File Upload', icon: '📄' },
            { id: 'url', label: 'Website Import', icon: '🌐' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                Business Information
              </label>
              <button
                onClick={generateSampleContent}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Add sample content
              </button>
            </div>
            <textarea
              value={knowledgeBase}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full h-80 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Enter information about your business, services, policies, FAQ, etc.

Examples:
- Business hours and location
- Services and pricing
- Frequently asked questions
- Policies and procedures
- Contact information"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{knowledgeBase.length} characters</span>
              <span>This information will help your assistant answer customer questions</span>
            </div>
          </div>
        )}

        {activeTab === 'file' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.docx,.md"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
              />
              
              <div className="space-y-4">
                <div className="text-4xl">📄</div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Upload a file</h3>
                  <p className="text-gray-600">
                    Support for .txt, .pdf, .docx, and .md files
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Choose File'}
                </button>
              </div>
            </div>

            {knowledgeBase && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Current Content Preview:</h4>
                <div className="text-sm text-gray-700 max-h-32 overflow-y-auto">
                  {knowledgeBase.substring(0, 500)}
                  {knowledgeBase.length > 500 && '...'}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'url' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Website URL
              </label>
              <div className="flex space-x-3">
                <input
                  type="url"
                  value={urlToImport}
                  onChange={(e) => setUrlToImport(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://yourwebsite.com"
                />
                <button
                  onClick={handleUrlImport}
                  disabled={!urlToImport.trim() || isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Importing...' : 'Import'}
                </button>
              </div>
              <p className="text-sm text-gray-600">
                We'll extract relevant information from your website to build the knowledge base.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Coming Soon
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Website import functionality will be available in a future update. For now, please use the text input or file upload options.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">💡 Tips for better results:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Include business hours, contact information, and location</li>
          <li>• Add details about your services, products, and pricing</li>
          <li>• Include frequently asked questions and their answers</li>
          <li>• Mention your company policies and procedures</li>
          <li>• Keep information current and accurate</li>
        </ul>
      </div>

      {/* Continue Button */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Knowledge base is optional. You can always add or edit this information later.
        </div>
        <button
          onClick={handleContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}