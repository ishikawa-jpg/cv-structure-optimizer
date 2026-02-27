-- 開発・テスト用シードデータ
-- 注意: Supabase Auth の users テーブルに手動でユーザーを追加した後に実行

-- テストユーザーのプロファイル（UUIDは実際のauth.usersのIDに合わせること）
-- INSERT INTO public.profiles (id, email, display_name) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'テストユーザー');

-- テスト用アカウント
-- INSERT INTO public.accounts (user_id, name) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'テスト広告アカウント');
