-- CV設計バージョンテーブル（月次推奨・診断）
CREATE TABLE public.design_versions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lp_id                 uuid NOT NULL REFERENCES public.lps(id) ON DELETE CASCADE,
  year_month            text NOT NULL,  -- "YYYY-MM"
  final_value_base      integer DEFAULT 100,
  recommendations_json  jsonb,  -- 推奨イベント最大6件
  diagnostics_json      jsonb,  -- スコア/警告/月次提案/GA4-ToDo等
  created_at            timestamptz DEFAULT now(),
  UNIQUE(lp_id, year_month)
);

CREATE INDEX idx_design_versions_lp_id ON public.design_versions(lp_id);
CREATE INDEX idx_design_versions_year_month ON public.design_versions(year_month);
