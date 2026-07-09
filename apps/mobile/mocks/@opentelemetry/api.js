// Mock @opentelemetry/api — 在 React Native 中不可用
// @supabase/supabase-js 会在运行时动态加载此模块，若失败则静默降级（.catch(() => null)）
module.exports = {};
