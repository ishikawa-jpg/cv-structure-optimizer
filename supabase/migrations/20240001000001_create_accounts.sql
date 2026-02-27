-- 広告アカウントテーブル
CREATE TABLE public.accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                text NOT NULL,
  ga4_property_id     text,
  ga4_property_name   text,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
