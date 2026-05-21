-- 给 usage_events 添加 ip_address 列（匿名用户追踪）
ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS ip_address text;
CREATE INDEX IF NOT EXISTS usage_events_ip_idx ON public.usage_events (ip_address, event_type, created_at);
