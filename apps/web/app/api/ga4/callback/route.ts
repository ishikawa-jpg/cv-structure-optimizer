import { createClient } from '@/lib/supabase/server'
import { saveGA4Tokens } from '@/lib/ga4/token'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/accounts?ga4_error=access_denied`)
  }

  // Supabaseからユーザー取得
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  try {
    // コードをトークンに交換
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      throw new Error('Token exchange failed')
    }

    const tokenData = await tokenRes.json()
    await saveGA4Tokens(user.id, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    })

    return NextResponse.redirect(`${origin}/accounts?ga4_connected=true`)
  } catch {
    return NextResponse.redirect(`${origin}/accounts?ga4_error=token_exchange_failed`)
  }
}
