import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const { data, error } = await supabase
    .from('lps')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const body = await request.json()
  const { name, url, final_event_name, target_cpa } = body

  if (!url?.trim()) return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'URLは必須です' } }, { status: 400 })
  if (!final_event_name?.trim()) return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'コンバージョンイベント名は必須です' } }, { status: 400 })
  if (!target_cpa || target_cpa <= 0) return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: '目標CPAは正の整数で入力してください' } }, { status: 400 })

  const { data, error } = await supabase
    .from('lps')
    .insert({ account_id: accountId, name: name?.trim() || null, url: url.trim(), final_event_name: final_event_name.trim(), target_cpa: parseInt(target_cpa) })
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null }, { status: 201 })
}
