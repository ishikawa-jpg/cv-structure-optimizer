-- RLS ポリシー設定

-- accounts テーブル
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_owner_select" ON public.accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "accounts_owner_insert" ON public.accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "accounts_owner_update" ON public.accounts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "accounts_owner_delete" ON public.accounts
  FOR DELETE USING (user_id = auth.uid());

-- lps テーブル（accounts 経由で所有者チェック）
ALTER TABLE public.lps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lps_owner_select" ON public.lps
  FOR SELECT USING (
    account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "lps_owner_insert" ON public.lps
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "lps_owner_update" ON public.lps
  FOR UPDATE USING (
    account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid())
  );

CREATE POLICY "lps_owner_delete" ON public.lps
  FOR DELETE USING (
    account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid())
  );

-- design_versions テーブル（lps 経由で所有者チェック）
ALTER TABLE public.design_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_versions_owner_select" ON public.design_versions
  FOR SELECT USING (
    lp_id IN (
      SELECT l.id FROM public.lps l
      JOIN public.accounts a ON l.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "design_versions_owner_insert" ON public.design_versions
  FOR INSERT WITH CHECK (
    lp_id IN (
      SELECT l.id FROM public.lps l
      JOIN public.accounts a ON l.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "design_versions_owner_update" ON public.design_versions
  FOR UPDATE USING (
    lp_id IN (
      SELECT l.id FROM public.lps l
      JOIN public.accounts a ON l.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "design_versions_owner_delete" ON public.design_versions
  FOR DELETE USING (
    lp_id IN (
      SELECT l.id FROM public.lps l
      JOIN public.accounts a ON l.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- performance_months テーブル（lps 経由で所有者チェック）
ALTER TABLE public.performance_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "performance_months_owner_select" ON public.performance_months
  FOR SELECT USING (
    lp_id IN (
      SELECT l.id FROM public.lps l
      JOIN public.accounts a ON l.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "performance_months_owner_insert" ON public.performance_months
  FOR INSERT WITH CHECK (
    lp_id IN (
      SELECT l.id FROM public.lps l
      JOIN public.accounts a ON l.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "performance_months_owner_update" ON public.performance_months
  FOR UPDATE USING (
    lp_id IN (
      SELECT l.id FROM public.lps l
      JOIN public.accounts a ON l.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "performance_months_owner_delete" ON public.performance_months
  FOR DELETE USING (
    lp_id IN (
      SELECT l.id FROM public.lps l
      JOIN public.accounts a ON l.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- performance_breakdowns テーブル（performance_months 経由で所有者チェック）
ALTER TABLE public.performance_breakdowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "performance_breakdowns_owner_select" ON public.performance_breakdowns
  FOR SELECT USING (
    performance_month_id IN (
      SELECT pm.id FROM public.performance_months pm
      JOIN public.lps l ON pm.lp_id = l.id
      JOIN public.accounts a ON l.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "performance_breakdowns_owner_insert" ON public.performance_breakdowns
  FOR INSERT WITH CHECK (
    performance_month_id IN (
      SELECT pm.id FROM public.performance_months pm
      JOIN public.lps l ON pm.lp_id = l.id
      JOIN public.accounts a ON l.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "performance_breakdowns_owner_update" ON public.performance_breakdowns
  FOR UPDATE USING (
    performance_month_id IN (
      SELECT pm.id FROM public.performance_months pm
      JOIN public.lps l ON pm.lp_id = l.id
      JOIN public.accounts a ON l.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "performance_breakdowns_owner_delete" ON public.performance_breakdowns
  FOR DELETE USING (
    performance_month_id IN (
      SELECT pm.id FROM public.performance_months pm
      JOIN public.lps l ON pm.lp_id = l.id
      JOIN public.accounts a ON l.account_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );
