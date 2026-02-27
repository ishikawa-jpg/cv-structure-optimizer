import { createServiceClient } from '@/lib/supabase/server'

interface TokenData {
  access_token: string
  refresh_token: string
  expires_at: string
}

// トークンを取得・必要に応じてリフレッシュ
export async function getValidGA4Token(userId: string): Promise<string | null> {
  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('ga4_access_token, ga4_refresh_token, ga4_token_expires_at')
    .eq('id', userId)
    .single()

  if (!profile?.ga4_refresh_token) return null

  // トークン有効期限チェック（5分前に更新）
  const expiresAt = profile.ga4_token_expires_at
    ? new Date(profile.ga4_token_expires_at)
    : null
  const now = new Date()
  const isExpired = !expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000

  if (!isExpired && profile.ga4_access_token) {
    return profile.ga4_access_token
  }

  // リフレッシュトークンでアクセストークンを更新
  const newToken = await refreshAccessToken(profile.ga4_refresh_token)
  if (!newToken) return null

  // DBに保存
  await supabase
    .from('profiles')
    .update({
      ga4_access_token: newToken.access_token,
      ga4_token_expires_at: new Date(Date.now() + newToken.expires_in * 1000).toISOString(),
    })
    .eq('id', userId)

  return newToken.access_token
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// トークンをDBに保存（サービスロールでRLSバイパス・upsertで行がなくても作成）
export async function saveGA4Tokens(userId: string, tokens: TokenData): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ga4_access_token: tokens.access_token,
      ga4_refresh_token: tokens.refresh_token,
      ga4_token_expires_at: tokens.expires_at,
    }, { onConflict: 'id' })
  if (error) {
    console.error('saveGA4Tokens error:', error)
    throw new Error('GA4トークンの保存に失敗しました')
  }
}
