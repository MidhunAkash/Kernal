-- Create direct_messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  pair_key TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX idx_direct_messages_pair_key ON public.direct_messages(pair_key);
CREATE INDEX idx_direct_messages_created_at ON public.direct_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages where they are sender or receiver
CREATE POLICY "Users can read own messages" 
  ON public.direct_messages 
  FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can insert messages where they are the sender
CREATE POLICY "Users can send messages" 
  ON public.direct_messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- Users can update their received messages (for marking as read)
CREATE POLICY "Users can update received messages" 
  ON public.direct_messages 
  FOR UPDATE 
  USING (auth.uid() = receiver_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- Function to generate pair_key (ensures same key for user1-user2 and user2-user1)
CREATE OR REPLACE FUNCTION generate_pair_key(user1 UUID, user2 UUID)
RETURNS TEXT AS $$
BEGIN
  IF user1 < user2 THEN
    RETURN user1::TEXT || '_' || user2::TEXT;
  ELSE
    RETURN user2::TEXT || '_' || user1::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
