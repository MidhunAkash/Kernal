# Setting Up Real-Time Chat System

## Database Setup

Run these SQL scripts in your Supabase SQL Editor:

### 1. Update Users Table (if needed)
```sql
-- Run this from: /app/database/update_users_table.sql
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'jobs_created'
  ) THEN
    ALTER TABLE public.users ADD COLUMN jobs_created TEXT[];
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
```

### 2. Create Direct Messages Table
```sql
-- Run this from: /app/database/create_direct_messages_table.sql
-- This creates the messages table with real-time support

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  pair_key TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX idx_direct_messages_pair_key ON public.direct_messages(pair_key);
CREATE INDEX idx_direct_messages_created_at ON public.direct_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own messages" 
  ON public.direct_messages 
  FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
  ON public.direct_messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received messages" 
  ON public.direct_messages 
  FOR UPDATE 
  USING (auth.uid() = receiver_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
```

## Features

### User Search
- Search users by email (partial match)
- Search users by ID (exact match)
- Returns up to 10 results

### Chat Interface
- **Left Sidebar**: Conversations list and user search
- **Right Panel**: Selected conversation with messages
- **Real-time**: New messages appear instantly
- **Message History**: Scrollable message history

### Database Schema

**users table:**
- id (UUID) - Primary key, linked to auth.users
- email (TEXT) - User's email
- name (TEXT) - User's name
- linkedin, x, github (TEXT) - Social links
- jobs_created (TEXT[]) - Array of job IDs

**direct_messages table:**
- id (BIGSERIAL) - Auto-incrementing ID
- sender_id (UUID) - Who sent the message
- receiver_id (UUID) - Who receives the message
- body (TEXT) - Message content
- created_at (TIMESTAMPTZ) - When message was sent
- pair_key (TEXT) - Unique key for the conversation pair
- read (BOOLEAN) - Whether message has been read

### How pair_key Works
- Ensures consistency: user1-user2 and user2-user1 have same key
- Format: `{smaller_uuid}_{larger_uuid}`
- Used to query all messages between two users

## User Flow

1. **Sign Up** → Email verification → **Onboarding** → **Chat**
2. **Login** → **Onboarding** (if first time) → **Chat**
3. **Google OAuth** → Auto profile creation → **Chat**

### In Chat Page:
1. Search for users by email or ID
2. Click on search result to start conversation
3. Type and send messages
4. Messages appear in real-time for both users
5. Switch between conversations in sidebar

## Testing

1. Create two test accounts (different emails)
2. Login with first account → go to chat
3. Search for second account by email
4. Start conversation
5. Login with second account in different browser/incognito
6. See the message appear in real-time

## Real-Time Features

- Messages appear instantly without refresh
- Uses Supabase Realtime subscriptions
- Automatically subscribes to conversation when selected
- Unsubscribes when switching conversations
