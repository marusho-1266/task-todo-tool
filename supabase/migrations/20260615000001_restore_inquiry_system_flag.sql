-- Restore system flag on 問合せ・差し込み project (reverts 20260613000001_remove_inquiry_system_flag.sql)
UPDATE public.projects
SET is_system = true
WHERE title = '問合せ・差し込み' AND is_system = false;
