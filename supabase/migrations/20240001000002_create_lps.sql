-- LP（ランディングページ）テーブル
CREATE TABLE public.lps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name              text,
  url               text NOT NULL,
  final_event_name  text NOT NULL,
  target_cpa        integer NOT NULL,  -- 円（固定値）
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_lps_account_id ON public.lps(account_id);
