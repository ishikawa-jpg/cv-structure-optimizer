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
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'アカウントが見つかりません' } }, { status: 404 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const body = await request.json()
  const { name, ga4_property_id, ga4_property_name } = body

  const { data, error } = await supabase
    .from('accounts')
    .update({ name, ga4_property_id, ga4_property_name })
    .eq('id', accountId)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId)

  if (error) return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data: { success: true }, error: null })
}
