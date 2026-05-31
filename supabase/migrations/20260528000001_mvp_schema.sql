-- MVP schema: profiles, projects, tasks, todos, work_sessions
-- recurring_rules is deferred to P3 (v1)

-- ---------------------------------------------------------------------------
-- Shared: updated_at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4.1 profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  display_name text,
  work_day_start time NOT NULL DEFAULT '09:00',
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_id_user_id_match CHECK (id = user_id)
);

CREATE INDEX profiles_user_id_idx ON public.profiles (user_id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4.2 projects
-- ---------------------------------------------------------------------------
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  description text,
  category text,
  color text,
  is_system boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX projects_user_id_idx ON public.projects (user_id);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4.3 tasks
-- ---------------------------------------------------------------------------
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.tasks (id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_started',
  due_date date,
  estimate_minutes integer,
  actual_minutes integer NOT NULL DEFAULT 0,
  is_leaf boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tasks_user_id_idx ON public.tasks (user_id);
CREATE INDEX tasks_user_id_project_id_idx ON public.tasks (user_id, project_id);
CREATE INDEX tasks_parent_id_idx ON public.tasks (parent_id);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4.4 todos (recurring_rule_id FK deferred until recurring_rules in P3)
-- ---------------------------------------------------------------------------
CREATE TABLE public.todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  date date NOT NULL,
  scheduled_start timestamptz,
  planned_minutes integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'pending',
  recurring_rule_id uuid,
  rolled_from_todo_id uuid REFERENCES public.todos (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX todos_user_id_date_idx ON public.todos (user_id, date);
CREATE INDEX todos_task_id_idx ON public.todos (task_id);

CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4.5 work_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE public.work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  todo_id uuid NOT NULL REFERENCES public.todos (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_minutes integer,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX work_sessions_one_active_per_user
  ON public.work_sessions (user_id)
  WHERE ended_at IS NULL;

CREATE INDEX work_sessions_user_id_idx ON public.work_sessions (user_id);
CREATE INDEX work_sessions_todo_id_idx ON public.work_sessions (todo_id);
CREATE INDEX work_sessions_task_id_idx ON public.work_sessions (task_id);

CREATE TRIGGER work_sessions_updated_at
  BEFORE UPDATE ON public.work_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
