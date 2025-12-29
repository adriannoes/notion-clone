-- Create page versions table
CREATE TABLE page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  blocks JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_page_versions_page ON page_versions(page_id, created_at DESC);
CREATE INDEX idx_page_versions_created_by ON page_versions(created_by);

-- Enable RLS
ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page versions
CREATE POLICY "Users can view versions of pages in their workspaces"
  ON page_versions FOR SELECT
  USING (
    page_id IN (
      SELECT id FROM pages WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create versions if editor+ role"
  ON page_versions FOR INSERT
  WITH CHECK (
    page_id IN (
      SELECT id FROM pages WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

CREATE POLICY "Users can delete versions if editor+ role"
  ON page_versions FOR DELETE
  USING (
    page_id IN (
      SELECT id FROM pages WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- Function to create a version snapshot
CREATE OR REPLACE FUNCTION create_page_version(
  p_page_id UUID,
  p_title TEXT,
  p_blocks JSONB,
  p_created_by UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  version_id UUID;
BEGIN
  -- Check if user can create versions for this page
  IF NOT EXISTS (
    SELECT 1 FROM pages p
    JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE p.id = p_page_id 
    AND wm.user_id = p_created_by
    AND wm.role IN ('owner', 'admin', 'editor')
  ) THEN
    RAISE EXCEPTION 'User does not have permission to create versions for this page';
  END IF;

  -- Create the version
  INSERT INTO page_versions (page_id, title, blocks, created_by)
  VALUES (p_page_id, p_title, p_blocks, p_created_by)
  RETURNING id INTO version_id;

  RETURN version_id;
END;
$$;

-- Function to restore a page from version
CREATE OR REPLACE FUNCTION restore_page_from_version(
  p_version_id UUID,
  p_created_by UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  version_record RECORD;
BEGIN
  -- Get version details
  SELECT pv.*, p.workspace_id
  INTO version_record
  FROM page_versions pv
  JOIN pages p ON pv.page_id = p.id
  WHERE pv.id = p_version_id;

  -- Check if user can restore this version
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = version_record.workspace_id
    AND wm.user_id = p_created_by
    AND wm.role IN ('owner', 'admin', 'editor')
  ) THEN
    RAISE EXCEPTION 'User does not have permission to restore this version';
  END IF;

  -- Update the page with version data
  UPDATE pages 
  SET title = version_record.title, updated_at = NOW()
  WHERE id = version_record.page_id;

  -- Delete existing blocks
  DELETE FROM blocks WHERE page_id = version_record.page_id;

  -- Insert blocks from version
  INSERT INTO blocks (page_id, type, content, metadata, position, created_at, updated_at)
  SELECT 
    version_record.page_id,
    (block->>'type')::TEXT,
    COALESCE(block->>'content', ''),
    COALESCE((block->>'metadata')::JSONB, '{}'::JSONB),
    (block->>'position')::INTEGER,
    NOW(),
    NOW()
  FROM jsonb_array_elements(version_record.blocks) AS block
  ORDER BY COALESCE((block->>'position')::INTEGER, 0);

  RETURN TRUE;
END;
$$;

-- Function to clean up old versions (keep last 50 versions per page)
CREATE OR REPLACE FUNCTION cleanup_old_versions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
  page_record RECORD;
BEGIN
  -- For each page, keep only the last 50 versions
  FOR page_record IN 
    SELECT page_id, COUNT(*) as version_count
    FROM page_versions
    GROUP BY page_id
    HAVING COUNT(*) > 50
  LOOP
    DELETE FROM page_versions
    WHERE page_id = page_record.page_id
    AND id NOT IN (
      SELECT id FROM page_versions
      WHERE page_id = page_record.page_id
      ORDER BY created_at DESC
      LIMIT 50
    );
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  END LOOP;

  RETURN deleted_count;
END;
$$;
