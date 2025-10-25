-- Create page_properties table
CREATE TABLE page_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE NOT NULL,
  property_name TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('text', 'number', 'select', 'multi_select', 'date', 'person', 'checkbox', 'url', 'email', 'phone')),
  value JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(page_id, property_name)
);

-- Create indexes for performance
CREATE INDEX idx_page_properties_page_id ON page_properties(page_id);
CREATE INDEX idx_page_properties_property_name ON page_properties(property_name);
CREATE INDEX idx_page_properties_property_type ON page_properties(property_type);

-- Create trigger to update updated_at
CREATE TRIGGER update_page_properties_updated_at
  BEFORE UPDATE ON page_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_updated_at();

-- RLS Policies for page_properties
ALTER TABLE page_properties ENABLE ROW LEVEL SECURITY;

-- Users can view properties of pages in their workspaces
CREATE POLICY "Users can view page properties in their workspaces"
  ON page_properties FOR SELECT
  USING (
    page_id IN (
      SELECT id FROM pages WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can insert properties if they have editor+ role
CREATE POLICY "Users can insert page properties if editor+ role"
  ON page_properties FOR INSERT
  WITH CHECK (
    page_id IN (
      SELECT id FROM pages WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- Users can update properties if they have editor+ role
CREATE POLICY "Users can update page properties if editor+ role"
  ON page_properties FOR UPDATE
  USING (
    page_id IN (
      SELECT id FROM pages WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- Users can delete properties if they have editor+ role
CREATE POLICY "Users can delete page properties if editor+ role"
  ON page_properties FOR DELETE
  USING (
    page_id IN (
      SELECT id FROM pages WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
      )
    )
  );

-- Function to get page properties
CREATE OR REPLACE FUNCTION get_page_properties(p_page_id UUID)
RETURNS TABLE (
  id UUID,
  property_name TEXT,
  property_type TEXT,
  value JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id,
    pp.property_name,
    pp.property_type,
    pp.value,
    pp.created_at,
    pp.updated_at
  FROM page_properties pp
  WHERE pp.page_id = p_page_id
  ORDER BY pp.property_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set page property
CREATE OR REPLACE FUNCTION set_page_property(
  p_page_id UUID,
  p_property_name TEXT,
  p_property_type TEXT,
  p_value JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  property_id UUID;
BEGIN
  INSERT INTO page_properties (
    page_id,
    property_name,
    property_type,
    value
  )
  VALUES (
    p_page_id,
    p_property_name,
    p_property_type,
    p_value
  )
  ON CONFLICT (page_id, property_name)
  DO UPDATE SET
    property_type = EXCLUDED.property_type,
    value = EXCLUDED.value,
    updated_at = NOW()
  RETURNING id INTO property_id;
  
  RETURN property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete page property
CREATE OR REPLACE FUNCTION delete_page_property(
  p_page_id UUID,
  p_property_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM page_properties 
  WHERE page_id = p_page_id AND property_name = p_property_name;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all unique property names in workspace
CREATE OR REPLACE FUNCTION get_workspace_property_names(p_workspace_id UUID)
RETURNS TABLE (
  property_name TEXT,
  property_type TEXT,
  usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.property_name,
    pp.property_type,
    COUNT(*) as usage_count
  FROM page_properties pp
  JOIN pages p ON pp.page_id = p.id
  WHERE p.workspace_id = p_workspace_id
  GROUP BY pp.property_name, pp.property_type
  ORDER BY usage_count DESC, pp.property_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
