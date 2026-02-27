import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GA4PropertySelector } from '@/components/dashboard/ga4-property-selector'

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const { accountId } = await params
  const supabase = await createClient()

  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (accountError || !account) notFound()

  const { data: lps } = await supabase
    .from('lps')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/accounts" className="hover:text-blue-600">アカウント一覧</Link>
        <span>/</span>
        <span className="text-gray-900">{account.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
          <div className="mt-1">
            <GA4PropertySelector
              accountId={accountId}
              currentPropertyName={account.ga4_property_name}
            />
          </div>
        </div>
        <Link
          href={`/accounts/${accountId}/lps/new`}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          + LP追加
        </Link>
      </div>

      {!lps || lps.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">LPがありません</p>
          <Link href={`/accounts/${accountId}/lps/new`} className="mt-2 text-blue-600 hover:underline text-sm">
            最初のLPを追加する
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {lps.map((lp) => (
            <Link
              key={lp.id}
              href={`/lps/${lp.id}`}
              className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{lp.name || lp.url}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    最終CV: {lp.final_event_name} / 目標CPA: ¥{lp.target_cpa.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 truncate max-w-md">{lp.url}</p>
                </div>
                <svg className="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
