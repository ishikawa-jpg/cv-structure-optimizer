import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserNav } from '@/components/dashboard/user-nav'
import Link from 'next/link'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* サイドバー */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">CV Optimizer</h2>
          <p className="text-xs text-gray-500 mt-1">Google広告CV値最大化</p>
        </div>
        <nav className="flex-1 mt-4">
          <Link
            href="/accounts"
            className="flex items-center px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <svg
              className="mr-3 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            アカウント一覧
          </Link>
        </nav>
        <div className="p-4 border-t">
          <UserNav />
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
