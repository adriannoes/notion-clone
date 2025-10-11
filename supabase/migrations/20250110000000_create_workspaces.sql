-- Create workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create workspace members table with roles
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Add workspace_id to pages table
ALTER TABLE pages ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX idx_pages_workspace ON pages(workspace_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_workspace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_updated_at();

-- RLS Policies for workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Users can view workspaces they are members of
CREATE POLICY "Users can view workspaces they are members of"
  ON workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create workspaces (they become owner)
CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can update workspaces if they are owner or admin
CREATE POLICY "Users can update workspaces if owner or admin"
  ON workspaces FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Users can delete workspaces if they are owner
CREATE POLICY "Users can delete workspaces if owner"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Workspace members policies
CREATE POLICY "Users can view workspace members"
  ON workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add members if admin+"
  ON workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update members if admin+"
  ON workspace_members FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can remove members if admin+"
  ON workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Update pages RLS to include workspace access
DROP POLICY IF EXISTS "Users can view own pages" ON pages;
DROP POLICY IF EXISTS "Users can insert own pages" ON pages;
DROP POLICY IF EXISTS "Users can update own pages" ON pages;
DROP POLICY IF EXISTS "Users can delete own pages" ON pages;

CREATE POLICY "Users can view pages in their workspaces"
  ON pages FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pages in their workspaces"
  ON pages FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pages if editor+ role"
  ON pages FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users can delete pages if editor+ role"
  ON pages FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Update blocks RLS to include workspace access
DROP POLICY IF EXISTS "Users can view blocks of own pages" ON blocks;
DROP POLICY IF EXISTS "Users can insert blocks on own pages" ON blocks;
DROP POLICY IF EXISTS "Users can update blocks of own pages" ON blocks;
DROP POLICY IF EXISTS "Users can delete blocks of own pages" ON blocks;

CREATE POLICY "Users can view blocks in their workspaces"
  ON blocks FOR SELECT
  USING (
    page_id IN (
      SELECT id FROM pages WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert blocks if editor+ role"
  ON blocks FOR INSERT
  WITH CHECK (
    page_id IN (
      SELECT id FROM pages WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

CREATE POLICY "Users can update blocks if editor+ role"
  ON blocks FOR UPDATE
  USING (
    page_id IN (
      SELECT id FROM pages WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

CREATE POLICY "Users can delete blocks if editor+ role"
  ON blocks FOR DELETE
  USING (
    page_id IN (
      SELECT id FROM pages WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );
