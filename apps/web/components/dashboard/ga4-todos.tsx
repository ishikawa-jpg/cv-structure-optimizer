'use client'

import { useState } from 'react'
import type { GA4Todo } from '@cv-optimizer/shared-types'

interface GA4TodosProps {
  todos: GA4Todo[]
}

const PRIORITY_CONFIG = {
  high:   { label: '高', className: 'bg-red-100 text-red-700' },
  medium: { label: '中', className: 'bg-yellow-100 text-yellow-700' },
  low:    { label: '低', className: 'bg-gray-100 text-gray-500' },
}

const CATEGORY_CONFIG = {
  key_event:         { label: 'キーイベント', icon: '[KE]' },
  custom_definition: { label: 'カスタム定義', icon: '[CD]' },
  audience:          { label: 'オーディエンス', icon: '[AU]' },
  gtm_tag:           { label: 'GTMタグ', icon: '[GTM]' },
}

function TodoItem({ todo }: { todo: GA4Todo }) {
  const [open, setOpen] = useState(false)
  const priority = PRIORITY_CONFIG[todo.priority]
  const category = CATEGORY_CONFIG[todo.category]

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">{category.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{todo.title}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${priority.className}`}>
                優先度: {priority.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{todo.description}</p>
          </div>
        </div>
        <svg
          className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
          <ol className="mt-3 space-y-1">
            {todo.steps.map((step, i) => (
              <li key={i} className="text-sm text-gray-700">{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

export function GA4Todos({ todos }: GA4TodosProps) {
  const [expanded, setExpanded] = useState(false)

  if (todos.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="font-semibold text-gray-900">
          GA4/GTM 設定 ToDo
          <span className="ml-2 text-sm font-normal text-gray-500">({todos.length}件)</span>
        </h3>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {todos.map((todo, i) => (
            <TodoItem key={i} todo={todo} />
          ))}
        </div>
      )}
    </div>
  )
}
