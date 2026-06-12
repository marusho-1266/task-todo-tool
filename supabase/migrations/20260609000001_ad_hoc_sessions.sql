-- Ad-hoc (interrupt) sessions: label on work_sessions, plumbing flag on todos

ALTER TABLE public.work_sessions
  ADD COLUMN IF NOT EXISTS label text;

ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS is_ad_hoc boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.work_sessions.label IS
  'Display title for ad-hoc sessions (割込計測). Overrides linked task title in UI/CSV.';
COMMENT ON COLUMN public.todos.is_ad_hoc IS
  'True for interrupt-measurement plumbing todos: no plan block on timeline.';

-- Bucket task under 問合せ・差し込み for existing users
INSERT INTO public.tasks (user_id, project_id, title, status, is_leaf)
SELECT p.user_id, p.id, '（割込記録）', 'not_started', true
FROM public.projects p
WHERE p.is_system = true
  AND p.title = '問合せ・差し込み'
  AND NOT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.user_id = p.user_id
      AND t.project_id = p.id
      AND t.title = '（割込記録）'
  );

-- Signup: also create the interrupt bucket task
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inquiry_project_id uuid;
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, user_id, email, work_day_start)
    VALUES (
      NEW.id,
      NEW.id,
      CASE
        WHEN NEW.email IS NULL THEN NULL
        ELSE NULLIF(trim(NEW.email), '')
      END,
      '09:00'
    );

    INSERT INTO public.projects (user_id, title, status, is_system)
    VALUES
      (NEW.id, 'Inbox', 'not_started', true),
      (NEW.id, '問合せ・差し込み', 'not_started', true);

    SELECT id INTO inquiry_project_id
    FROM public.projects
    WHERE user_id = NEW.id
      AND title = '問合せ・差し込み'
      AND is_system = true
    LIMIT 1;

    IF inquiry_project_id IS NOT NULL THEN
      INSERT INTO public.tasks (user_id, project_id, title, status, is_leaf)
      VALUES (NEW.id, inquiry_project_id, '（割込記録）', 'not_started', true);
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'handle_new_user(): failed inserting into public.profiles or public.projects for user_id=%: %',
        NEW.id, SQLERRM;
      RAISE EXCEPTION
        'handle_new_user(): failed to initialize public.profiles/public.projects for user_id %: %',
        NEW.id, SQLERRM
        USING ERRCODE = SQLSTATE;
  END;

  RETURN NEW;
END;
$$;
