-- Create comments table for block discussions
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE NOT NULL,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_block_id ON comments(block_id);
CREATE INDEX IF NOT EXISTS idx_comments_page_id ON comments(page_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_resolved ON comments(resolved);

-- Create trigger to update updated_at
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on pages they have access to
CREATE POLICY "Users can view comments on accessible pages"
  ON comments FOR SELECT
  USING (
    page_id IN (
      SELECT id FROM pages 
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can insert comments on pages they can edit
CREATE POLICY "Users can insert comments if they can edit"
  ON comments FOR INSERT
  WITH CHECK (
    page_id IN (
      SELECT p.id FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin', 'editor')
    )
    AND user_id = auth.uid()
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments or comments on pages they own/admin
CREATE POLICY "Users can delete their own comments or admin"
  ON comments FOR DELETE
  USING (
    user_id = auth.uid() OR
    page_id IN (
      SELECT p.id FROM pages p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin')
    )
  );

