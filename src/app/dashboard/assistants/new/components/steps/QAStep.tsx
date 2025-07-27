'use client'

import { useState } from 'react'
import { useWizardStore, QAPair } from '../../lib/wizard-store'

export function QAStep() {
  const { qaPairs, addQAPair, updateQAPair, removeQAPair, markStepCompleted } = useWizardStore()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newPair, setNewPair] = useState({ question: '', answer: '', priority: 1 })

  const handleAddPair = () => {
    if (!newPair.question.trim() || !newPair.answer.trim()) return
    
    addQAPair(newPair)
    setNewPair({ question: '', answer: '', priority: 1 })
    setIsAdding(false)
  }

  const handleUpdatePair = (id: string, updates: Partial<QAPair>) => {
    updateQAPair(id, updates)
    setEditingId(null)
  }

  const handleDeletePair = (id: string) => {
    if (confirm('Are you sure you want to delete this Q&A pair?')) {
      removeQAPair(id)
    }
  }

  const addSamplePairs = () => {
    const samples = [
      {
        question: "What are your business hours?",
        answer: "We're open Monday through Friday from 9 AM to 5 PM, and Saturday from 10 AM to 3 PM. We're closed on Sundays.",
        priority: 1
      },
      {
        question: "How can I schedule an appointment?",
        answer: "You can schedule an appointment by calling us directly, and I'll be happy to transfer you to our scheduling team, or you can visit our website to book online.",
        priority: 2
      },
      {
        question: "What services do you offer?",
        answer: "We offer a comprehensive range of services including consultation, implementation, and ongoing support. I can transfer you to a specialist who can discuss your specific needs in detail.",
        priority: 3
      }
    ]

    samples.forEach(sample => addQAPair(sample))
  }

  const handleContinue = () => {
    markStepCompleted(3)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Q&A Pairs
        </h2>
        <p className="text-gray-600">
          Add specific questions and answers to ensure your assistant gives accurate responses to common inquiries.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-3">
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Add Q&A Pair
          </button>
          {qaPairs.length === 0 && (
            <button
              onClick={addSamplePairs}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Add Sample Pairs
            </button>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {qaPairs.length} Q&A pair{qaPairs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Add New Pair Form */}
      {isAdding && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Q&A Pair</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question
              </label>
              <input
                type="text"
                value={newPair.question}
                onChange={(e) => setNewPair(prev => ({ ...prev, question: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What question might customers ask?"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Answer
              </label>
              <textarea
                value={newPair.answer}
                onChange={(e) => setNewPair(prev => ({ ...prev, answer: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="How should your assistant respond?"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority (1 = highest)
              </label>
              <select
                value={newPair.priority}
                onChange={(e) => setNewPair(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPair}
              disabled={!newPair.question.trim() || !newPair.answer.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              Add Pair
            </button>
          </div>
        </div>
      )}

      {/* Existing Q&A Pairs */}
      {qaPairs.length > 0 ? (
        <div className="space-y-4">
          {qaPairs
            .sort((a, b) => a.priority - b.priority)
            .map((pair) => (
              <QAPairCard
                key={pair.id}
                pair={pair}
                isEditing={editingId === pair.id}
                onEdit={() => setEditingId(pair.id)}
                onSave={(updates) => handleUpdatePair(pair.id, updates)}
                onCancel={() => setEditingId(null)}
                onDelete={() => handleDeletePair(pair.id)}
              />
            ))}
        </div>
      ) : !isAdding && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-4xl mb-4">❓</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Q&A pairs yet</h3>
          <p className="text-gray-600 mb-4">
            Add specific questions and answers to ensure consistent, accurate responses.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Add Your First Q&A Pair
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">💡 Best Practices:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use natural, conversational language for questions</li>
          <li>• Keep answers concise but complete</li>
          <li>• Higher priority (lower number) answers are used first</li>
          <li>• Include variations of common questions</li>
          <li>• Test your Q&A pairs to ensure they sound natural</li>
        </ul>
      </div>

      {/* Continue Button */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Q&A pairs are optional but help ensure consistent responses.
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

interface QAPairCardProps {
  pair: QAPair
  isEditing: boolean
  onEdit: () => void
  onSave: (updates: Partial<QAPair>) => void
  onCancel: () => void
  onDelete: () => void
}

function QAPairCard({ pair, isEditing, onEdit, onSave, onCancel, onDelete }: QAPairCardProps) {
  const [editData, setEditData] = useState({
    question: pair.question,
    answer: pair.answer,
    priority: pair.priority
  })

  const handleSave = () => {
    onSave(editData)
  }

  if (isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question
            </label>
            <input
              type="text"
              value={editData.question}
              onChange={(e) => setEditData(prev => ({ ...prev, question: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Answer
            </label>
            <textarea
              value={editData.answer}
              onChange={(e) => setEditData(prev => ({ ...prev, answer: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={editData.priority}
              onChange={(e) => setEditData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
              Priority {pair.priority}
            </span>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {pair.question}
          </h4>
          <p className="text-gray-700">
            {pair.answer}
          </p>
        </div>
        
        <div className="flex space-x-2 ml-4">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}