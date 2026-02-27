// 共有型定義

export interface Account {
  id: string;
  user_id: string;
  name: string;
  ga4_property_id: string | null;
  ga4_property_name: string | null;
  created_at: string;
}

export interface LP {
  id: string;
  account_id: string;
  name: string | null;
  url: string;
  final_event_name: string;
  target_cpa: number;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  ga4_access_token: string | null;
  ga4_refresh_token: string | null;
  ga4_token_expires_at: string | null;
  created_at: string;
}

export interface PerformanceMonth {
  id: string;
  lp_id: string;
  year_month: string;
  clicks: number;
  cost: number;
  final_cv: number;
  impressions: number | null;
  notes: string | null;
  cvr: number | null;
  cpa: number | null;
  cpa_status: CPAStatus;
  created_at: string;
}

export interface PerformanceBreakdown {
  id: string;
  performance_month_id: string;
  label: string;
  clicks: number;
  cost: number;
  final_cv: number;
  impressions: number | null;
}

export interface DesignVersion {
  id: string;
  lp_id: string;
  year_month: string;
  final_value_base: number;
  recommendations_json: RecommendationsJson | null;
  diagnostics_json: DiagnosticsJson | null;
  created_at: string;
}

export type CPAStatus = 'green' | 'yellow' | 'red' | 'undefined';
export type CVRJudgment =
  | 'significant_improve'
  | 'trend_improve'
  | 'no_change'
  | 'significant_worse'
  | 'insufficient_data';
export type AlertLevel = 'info' | 'warning' | 'critical';
export type Confidence = 'high' | 'medium' | 'low';

export interface RecommendationItem {
  event_name: string;
  cv_value: number;
  confidence: Confidence;
  estimation_method: string;
  p_a: number;
  p_b: number | null;
  count_a_event: number;
  count_b_event: number;
  count_a_final: number;
  count_b_final: number;
  cap_applied: string | null;
  label: string;
  is_detected_in_lp: boolean;
}

export interface RecommendationsJson {
  items: RecommendationItem[];
  total_cv_score: number;
  generated_at: string;
  date_range: { start: string; end: string };
}

export interface Alert {
  level: AlertLevel;
  code: string;
  message: string;
}

export interface MonthlyProposal {
  slot: 'optimization' | 'enhancement';
  title: string;
  description: string;
  action_type:
    | 'adjust_cv_value'
    | 'remove_event'
    | 'add_event'
    | 'add_gtm_tag'
    | 'add_ga4_custom_def'
    | 'check_key_event';
  target_event?: string;
  suggested_value?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  reason: string;
}

export interface GA4Todo {
  category: 'key_event' | 'custom_definition' | 'audience' | 'gtm_tag';
  title: string;
  description: string;
  steps: string[];
  priority: 'high' | 'medium' | 'low';
  event_name?: string;
}

export interface GTMTemplate {
  category: 'gtm_tag';
  title: string;
  description: string;
  steps: string[];
  priority: 'high' | 'medium' | 'low';
  event_name?: string;
}

export interface DiagnosticsJson {
  score: number;
  score_breakdown: {
    signal_coverage: number;
    value_separation: number;
    data_reliability: number;
    noise_risk: number;
  };
  alerts: Alert[];
  monthly_proposals: MonthlyProposal[];
  ga4_todos: GA4Todo[];
  gtm_templates: GTMTemplate[];
  generated_at: string;
}

export interface APIResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}
