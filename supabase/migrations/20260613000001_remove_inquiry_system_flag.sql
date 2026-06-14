-- Remove system flag from 問合せ・差し込み project for existing users
UPDATE public.projects
SET is_system = false
WHERE title = '問合せ・差し込み' AND is_system = true;
