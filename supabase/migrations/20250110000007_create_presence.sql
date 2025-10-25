-- Create page_presence table for real-time user presence
CREATE TABLE page_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  cursor_position JSONB DEFAULT '{}',
  last_seen TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, page_id)
);

-- Create indexes for performance
CREATE INDEX idx_page_presence_page_id ON page_presence(page_id);
CREATE INDEX idx_page_presence_workspace_id ON page_presence(workspace_id);
CREATE INDEX idx_page_presence_user_id ON page_presence(user_id);
CREATE INDEX idx_page_presence_is_active ON page_presence(is_active);
CREATE INDEX idx_page_presence_last_seen ON page_presence(last_seen);

-- Create trigger to update updated_at
CREATE TRIGGER update_page_presence_updated_at
  BEFORE UPDATE ON page_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_updated_at();

-- RLS Policies for page_presence
ALTER TABLE page_presence ENABLE ROW LEVEL SECURITY;

-- Users can view presence in their workspaces
CREATE POLICY "Users can view presence in their workspaces"
  ON page_presence FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own presence
CREATE POLICY "Users can insert their own presence"
  ON page_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own presence
CREATE POLICY "Users can update their own presence"
  ON page_presence FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own presence
CREATE POLICY "Users can delete their own presence"
  ON page_presence FOR DELETE
  USING (user_id = auth.uid());

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence(
  p_user_id UUID,
  p_page_id UUID,
  p_workspace_id UUID,
  p_cursor_position JSONB DEFAULT '{}',
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  presence_id UUID;
BEGIN
  INSERT INTO page_presence (
    user_id, 
    page_id, 
    workspace_id, 
    cursor_position, 
    is_active,
    last_seen
  )
  VALUES (
    p_user_id, 
    p_page_id, 
    p_workspace_id, 
    p_cursor_position, 
    p_is_active,
    NOW()
  )
  ON CONFLICT (user_id, page_id)
  DO UPDATE SET
    cursor_position = EXCLUDED.cursor_position,
    is_active = EXCLUDED.is_active,
    last_seen = NOW(),
    updated_at = NOW()
  RETURNING id INTO presence_id;
  
  RETURN presence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active users on a page
CREATE OR REPLACE FUNCTION get_page_active_users(p_page_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_avatar TEXT,
  cursor_position JSONB,
  last_seen TIMESTAMP,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.user_id,
    p.full_name as user_name,
    p.avatar_url as user_avatar,
    pp.cursor_position,
    pp.last_seen,
    pp.is_active
  FROM page_presence pp
  JOIN profiles p ON pp.user_id = p.id
  WHERE pp.page_id = p_page_id 
    AND pp.is_active = TRUE
    AND pp.last_seen > NOW() - INTERVAL '5 minutes'
  ORDER BY pp.last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark user as inactive
CREATE OR REPLACE FUNCTION mark_user_inactive(p_user_id UUID, p_page_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE page_presence 
  SET is_active = FALSE, updated_at = NOW()
  WHERE user_id = p_user_id AND page_id = p_page_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old presence records
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM page_presence 
  WHERE last_seen < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up old presence (this would be set up in Supabase dashboard)
-- SELECT cron.schedule('cleanup-presence', '*/5 * * * *', 'SELECT cleanup_old_presence();');
