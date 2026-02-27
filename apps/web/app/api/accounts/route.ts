import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: '未認証' } }, { status: 401 })

  const body = await request.json()
  const { name } = body
  if (!name?.trim()) return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: '名前は必須です' } }, { status: 400 })

  const { data, error } = await supabase
    .from('accounts')
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  return NextResponse.json({ data, error: null }, { status: 201 })
}
