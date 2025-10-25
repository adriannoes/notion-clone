-- Create database_views table
CREATE TABLE database_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  view_type TEXT NOT NULL CHECK (view_type IN ('table', 'kanban', 'calendar')),
  configuration JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_database_views_workspace_id ON database_views(workspace_id);
CREATE INDEX idx_database_views_view_type ON database_views(view_type);
CREATE INDEX idx_database_views_is_default ON database_views(is_default);

-- Create trigger to update updated_at
CREATE TRIGGER update_database_views_updated_at
  BEFORE UPDATE ON database_views
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_updated_at();

-- RLS Policies for database_views
ALTER TABLE database_views ENABLE ROW LEVEL SECURITY;

-- Users can view database views in their workspaces
CREATE POLICY "Users can view database views in their workspaces"
  ON database_views FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert database views if they have editor+ role
CREATE POLICY "Users can insert database views if editor+ role"
  ON database_views FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Users can update database views if they have editor+ role
CREATE POLICY "Users can update database views if editor+ role"
  ON database_views FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Users can delete database views if they have editor+ role
CREATE POLICY "Users can delete database views if editor+ role"
  ON database_views FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Function to get pages with properties for table view
CREATE OR REPLACE FUNCTION get_pages_with_properties(
  p_workspace_id UUID,
  p_property_names TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  page_id UUID,
  page_title TEXT,
  page_created_at TIMESTAMP,
  page_updated_at TIMESTAMP,
  page_is_favorite BOOLEAN,
  properties JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as page_id,
    p.title as page_title,
    p.created_at as page_created_at,
    p.updated_at as page_updated_at,
    p.is_favorite as page_is_favorite,
    COALESCE(
      jsonb_object_agg(
        pp.property_name, 
        jsonb_build_object(
          'type', pp.property_type,
          'value', pp.value
        )
      ) FILTER (WHERE pp.property_name IS NOT NULL),
      '{}'::jsonb
    ) as properties
  FROM pages p
  LEFT JOIN page_properties pp ON p.id = pp.page_id
  WHERE p.workspace_id = p_workspace_id
    AND (p_property_names IS NULL OR pp.property_name = ANY(p_property_names))
  GROUP BY p.id, p.title, p.created_at, p.updated_at, p.is_favorite
  ORDER BY p.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get workspace property schema
CREATE OR REPLACE FUNCTION get_workspace_property_schema(p_workspace_id UUID)
RETURNS TABLE (
  property_name TEXT,
  property_type TEXT,
  usage_count BIGINT,
  sample_values JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.property_name,
    pp.property_type,
    COUNT(*) as usage_count,
    jsonb_agg(DISTINCT pp.value) as sample_values
  FROM page_properties pp
  JOIN pages p ON pp.page_id = p.id
  WHERE p.workspace_id = p_workspace_id
  GROUP BY pp.property_name, pp.property_type
  ORDER BY usage_count DESC, pp.property_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default table view
CREATE OR REPLACE FUNCTION create_default_table_view(p_workspace_id UUID)
RETURNS UUID AS $$
DECLARE
  view_id UUID;
BEGIN
  INSERT INTO database_views (
    workspace_id,
    name,
    view_type,
    configuration,
    is_default
  )
  VALUES (
    p_workspace_id,
    'Tabela',
    'table',
    '{"columns": ["title", "created_at", "updated_at"], "sort": {"column": "updated_at", "direction": "desc"}}'::jsonb,
    TRUE
  )
  RETURNING id INTO view_id;
  
  RETURN view_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
