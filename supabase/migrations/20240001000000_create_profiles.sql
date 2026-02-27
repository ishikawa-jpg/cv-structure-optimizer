-- Supabase Auth の auth.users を参照する公開プロファイルテーブル
CREATE TABLE public.profiles (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 text,
  display_name          text,
  -- GA4 OAuth トークン（ユーザーごと）
  ga4_access_token      text,
  ga4_refresh_token     text,
  ga4_token_expires_at  timestamptz,
  created_at            timestamptz DEFAULT now()
);

-- プロファイルテーブルのRLS有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 自分のプロファイルのみ閲覧・更新可
CREATE POLICY "profiles_owner_select" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_owner_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- 新規ユーザー登録時に自動でプロファイルを作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
