# Setting Up Users Table in Supabase

## Steps to Create the Users Table:

1. **Go to your Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/qaapsrecosekpcforkkl

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and paste the SQL from `/app/database/create_users_table.sql`**
   - Or copy the SQL below:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  linkedin TEXT,
  x TEXT,
  github TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can read their own data
CREATE POLICY "Users can read own data" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can insert their own data
CREATE POLICY "Users can insert own data" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

4. **Click "Run" or press Ctrl+Enter**
   - You should see "Success. No rows returned"

5. **Verify the table was created**
   - Click "Table Editor" in the left sidebar
   - You should see the "users" table listed

## What This Does:

- Creates a `users` table with columns: id, email, name, linkedin, x, github, created_at, updated_at
- Links to Supabase auth users (id is the same as auth.users.id)
- Enables Row Level Security so users can only access their own data
- Sets up automatic updated_at timestamp
- Allows users to read, insert, and update their own profile

## After Creating the Table:

The app will automatically:
1. Create a user profile when someone registers
2. Redirect to onboarding page
3. Let users add their social links
4. Store everything in the users table
