-- Security function to check user role in workspace
CREATE OR REPLACE FUNCTION public.get_user_workspace_role(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM workspace_members
  WHERE workspace_id = p_workspace_id 
  AND user_id = p_user_id
  LIMIT 1;
$$;

-- Function to check if user can edit in workspace
CREATE OR REPLACE FUNCTION public.can_user_edit_in_workspace(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id 
    AND user_id = p_user_id
    AND role IN ('owner', 'admin', 'editor')
  );
$$;

-- Function to check if user can delete in workspace
CREATE OR REPLACE FUNCTION public.can_user_delete_in_workspace(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id 
    AND user_id = p_user_id
    AND role IN ('owner', 'admin', 'editor')
  );
$$;

-- Function to check if user can manage workspace
CREATE OR REPLACE FUNCTION public.can_user_manage_workspace(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id 
    AND user_id = p_user_id
    AND role IN ('owner', 'admin')
  );
$$;

-- Update RLS policies for pages with role-based access
DROP POLICY IF EXISTS "Users can view pages in their workspaces" ON pages;
DROP POLICY IF EXISTS "Users can insert pages in their workspaces" ON pages;
DROP POLICY IF EXISTS "Users can update pages if editor+ role" ON pages;
DROP POLICY IF EXISTS "Users can delete pages if editor+ role" ON pages;

CREATE POLICY "Users can view pages in their workspaces"
  ON pages FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pages if editor+ role"
  ON pages FOR INSERT
  WITH CHECK (
    can_user_edit_in_workspace(workspace_id)
  );

CREATE POLICY "Users can update pages if editor+ role"
  ON pages FOR UPDATE
  USING (
    can_user_edit_in_workspace(workspace_id)
  );

CREATE POLICY "Users can delete pages if editor+ role"
  ON pages FOR DELETE
  USING (
    can_user_delete_in_workspace(workspace_id)
  );

-- Update RLS policies for blocks with role-based access
DROP POLICY IF EXISTS "Users can view blocks in their workspaces" ON blocks;
DROP POLICY IF EXISTS "Users can insert blocks if editor+ role" ON blocks;
DROP POLICY IF EXISTS "Users can update blocks if editor+ role" ON blocks;
DROP POLICY IF EXISTS "Users can delete blocks if editor+ role" ON blocks;

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
      SELECT id FROM pages WHERE can_user_edit_in_workspace(workspace_id)
    )
  );

CREATE POLICY "Users can update blocks if editor+ role"
  ON blocks FOR UPDATE
  USING (
    page_id IN (
      SELECT id FROM pages WHERE can_user_edit_in_workspace(workspace_id)
    )
  );

CREATE POLICY "Users can delete blocks if editor+ role"
  ON blocks FOR DELETE
  USING (
    page_id IN (
      SELECT id FROM pages WHERE can_user_delete_in_workspace(workspace_id)
    )
  );

-- Update workspace policies with role-based access
DROP POLICY IF EXISTS "Users can update workspaces if owner or admin" ON workspaces;
DROP POLICY IF EXISTS "Users can delete workspaces if owner" ON workspaces;

CREATE POLICY "Users can update workspaces if admin+"
  ON workspaces FOR UPDATE
  USING (
    can_user_manage_workspace(id)
  );

CREATE POLICY "Users can delete workspaces if owner"
  ON workspaces FOR DELETE
  USING (
    owner_id = auth.uid()
  );

-- Update workspace members policies with role-based access
DROP POLICY IF EXISTS "Users can add members if admin+" ON workspace_members;
DROP POLICY IF EXISTS "Users can update members if admin+" ON workspace_members;
DROP POLICY IF EXISTS "Users can remove members if admin+" ON workspace_members;

CREATE POLICY "Users can add members if admin+"
  ON workspace_members FOR INSERT
  WITH CHECK (
    can_user_manage_workspace(workspace_id)
  );

CREATE POLICY "Users can update members if admin+"
  ON workspace_members FOR UPDATE
  USING (
    can_user_manage_workspace(workspace_id)
  );

CREATE POLICY "Users can remove members if admin+"
  ON workspace_members FOR DELETE
  USING (
    can_user_manage_workspace(workspace_id)
  );
