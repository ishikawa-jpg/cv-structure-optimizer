import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">アカウント一覧</h1>
        <Link
          href="/accounts/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          + 新規アカウント作成
        </Link>
      </div>

      {!accounts || accounts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">アカウントがありません</p>
          <Link href="/accounts/new" className="mt-2 text-blue-600 hover:underline text-sm">
            最初のアカウントを作成する
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Link
              key={account.id}
              href={`/accounts/${account.id}`}
              className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{account.name}</h3>
                  {account.ga4_property_name && (
                    <p className="text-sm text-gray-500 mt-1">
                      GA4: {account.ga4_property_name}
                    </p>
                  )}
                  {!account.ga4_property_id && (
                    <p className="text-sm text-yellow-600 mt-1">GA4未連携</p>
                  )}
                </div>
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
