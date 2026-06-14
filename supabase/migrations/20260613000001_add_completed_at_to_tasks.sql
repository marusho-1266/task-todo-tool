-- Add completed_at column to tasks table for tracking completion timestamps
alter table tasks add column completed_at timestamptz;

-- Comment on the column
comment on column tasks.completed_at is 'Timestamp when the task was marked as done';
