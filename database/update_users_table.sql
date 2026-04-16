-- Update users table to ensure all columns exist
-- (linkedin, x, github already exist, adding jobs_created if needed)

-- Add jobs_created column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'jobs_created'
  ) THEN
    ALTER TABLE public.users ADD COLUMN jobs_created TEXT[];
  END IF;
END $$;

-- Create index on email for faster searches
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
