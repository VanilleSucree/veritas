-- Link ticket attachments to sales/install pmTasks (client-generated task ids).
ALTER TABLE v_b_ticket_attachments
  ADD COLUMN IF NOT EXISTS task_id TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_v_b_ticket_attachments_ticket_task
  ON v_b_ticket_attachments (ticket_id, task_id)
  WHERE task_id IS NOT NULL;
