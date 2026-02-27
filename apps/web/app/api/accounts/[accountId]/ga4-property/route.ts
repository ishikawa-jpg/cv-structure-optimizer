import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const body = await request.json()
  const { ga4_property_id, ga4_property_name } = body

  if (!ga4_property_id) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'GA4 Property IDは必須です' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('accounts')
    .update({ ga4_property_id, ga4_property_name })
    .eq('id', accountId)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
