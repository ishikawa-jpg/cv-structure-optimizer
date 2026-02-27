import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lpId: string }> }
) {
  const { lpId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const { data, error } = await supabase
    .from('lps')
    .select('*, accounts!inner(user_id, name, ga4_property_id, ga4_property_name)')
    .eq('id', lpId)
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'LPが見つかりません' } }, { status: 404 })
  return NextResponse.json({ data, error: null })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ lpId: string }> }
) {
  const { lpId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const body = await request.json()
  const { name, url, final_event_name, target_cpa } = body

  const { data, error } = await supabase
    .from('lps')
    .update({ name: name?.trim() || null, url: url?.trim(), final_event_name: final_event_name?.trim(), target_cpa: target_cpa ? parseInt(target_cpa) : undefined })
    .eq('id', lpId)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ lpId: string }> }
) {
  const { lpId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const { error } = await supabase
    .from('lps')
    .delete()
    .eq('id', lpId)

  if (error) return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data: { success: true }, error: null })
}
