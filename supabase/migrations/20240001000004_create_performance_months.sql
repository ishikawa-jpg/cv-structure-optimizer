-- 月次成果テーブル
CREATE TABLE public.performance_months (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lp_id         uuid NOT NULL REFERENCES public.lps(id) ON DELETE CASCADE,
  year_month    text NOT NULL,
  clicks        integer NOT NULL,
  cost          integer NOT NULL,   -- 円
  final_cv      integer NOT NULL,
  impressions   integer,
  notes         text,
  -- 算出値（保存しておく）
  cvr           numeric(10,6),      -- final_cv / clicks
  cpa           integer,            -- cost / final_cv (null if final_cv=0)
  cpa_status    text CHECK (cpa_status IN ('green', 'yellow', 'red', 'undefined')),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(lp_id, year_month)
);

CREATE INDEX idx_performance_months_lp_id ON public.performance_months(lp_id);
CREATE INDEX idx_performance_months_year_month ON public.performance_months(year_month);
