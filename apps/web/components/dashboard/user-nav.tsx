'use client'

import { useUser } from '@/hooks/use-user'

export function UserNav() {
  const { user, loading } = useUser()

  const handleSignOut = async () => {
    await fetch('/auth/signout', { method: 'POST' })
    window.location.href = '/login'
  }

  if (loading) {
    return <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700">
        {user?.email ?? 'ユーザー'}
      </span>
      <button
        onClick={handleSignOut}
        className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
      >
        ログアウト
      </button>
    </div>
  )
}
