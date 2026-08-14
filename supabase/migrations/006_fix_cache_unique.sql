-- 修复 ai_results_cache 重复行问题
-- PostgreSQL UNIQUE 约束将 NULL 视为不相等，导致同一 (video_id, result_type, language)
-- 出现多条记录。方案：为 moments 类型将 theme 从 NULL 替换为空字符串 ''。
-- summary 类型保留 NULL（不使用 theme/mode 字段）。

-- 1. 清理重复行：保留每个组合的最新记录
delete from public.ai_results_cache
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by video_id, result_type, language, mode, theme
        order by created_at desc
      ) as rn
    from public.ai_results_cache
  ) sub
  where sub.rn > 1
);

-- 2. 将 moments 类型的 theme=NULL 替换为 ''（代码已同步修改）
--    summary 类型保留 NULL（不使用 theme 字段）
update public.ai_results_cache
  set theme = ''
  where theme is null
    and result_type = 'moments';
