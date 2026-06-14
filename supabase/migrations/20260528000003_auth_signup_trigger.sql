-- On auth.users insert: create profile + system projects (Inbox)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- OAuth/phone signups may leave auth.users.email NULL; profiles.email is optional (display only).
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
      (NEW.id, 'Inbox', 'not_started', true);
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
