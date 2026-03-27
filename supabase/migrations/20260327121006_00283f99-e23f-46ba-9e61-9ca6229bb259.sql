CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email_time ON contact_submissions (email, submitted_at);
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;