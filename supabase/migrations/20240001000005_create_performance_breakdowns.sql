-- 月次成果内訳テーブル（任意・キャンペーン別）
CREATE TABLE public.performance_breakdowns (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_month_id  uuid NOT NULL REFERENCES public.performance_months(id) ON DELETE CASCADE,
  label                 text NOT NULL,  -- キャンペーン名など
  clicks                integer NOT NULL,
  cost                  integer NOT NULL,
  final_cv              integer NOT NULL,
  impressions           integer
);

CREATE INDEX idx_performance_breakdowns_month_id ON public.performance_breakdowns(performance_month_id);
