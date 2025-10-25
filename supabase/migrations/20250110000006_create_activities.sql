-- Create activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'shared', 'commented', 'moved')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('page', 'block', 'workspace', 'member')),
  entity_id UUID NOT NULL,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_activities_workspace_id ON activities(workspace_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_created_at ON activities(created_at);
CREATE INDEX idx_activities_entity_type ON activities(entity_type);
CREATE INDEX idx_activities_entity_id ON activities(entity_id);

-- RLS Policies for activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Users can view activities in their workspaces
CREATE POLICY "Users can view activities in their workspaces"
  ON activities FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- System can insert activities
CREATE POLICY "System can insert activities"
  ON activities FOR INSERT
  WITH CHECK (true);

-- Function to create activity
CREATE OR REPLACE FUNCTION create_activity(
  p_user_id UUID,
  p_workspace_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO activities (
    user_id, 
    workspace_id, 
    action, 
    entity_type, 
    entity_id, 
    entity_name, 
    metadata
  )
  VALUES (
    p_user_id, 
    p_workspace_id, 
    p_action, 
    p_entity_type, 
    p_entity_id, 
    p_entity_name, 
    p_metadata
  )
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent activities for workspace
CREATE OR REPLACE FUNCTION get_workspace_activities(
  p_workspace_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  metadata JSONB,
  created_at TIMESTAMP,
  user_name TEXT,
  user_avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.user_id,
    a.action,
    a.entity_type,
    a.entity_id,
    a.entity_name,
    a.metadata,
    a.created_at,
    p.full_name as user_name,
    p.avatar_url as user_avatar
  FROM activities a
  JOIN profiles p ON a.user_id = p.id
  WHERE a.workspace_id = p_workspace_id
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically create activities
CREATE OR REPLACE FUNCTION create_page_activity()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id UUID;
BEGIN
  -- Get workspace_id from the page
  SELECT p.workspace_id INTO workspace_id
  FROM pages p
  WHERE p.id = COALESCE(NEW.id, OLD.id);
  
  -- Create activity based on operation
  IF TG_OP = 'INSERT' THEN
    PERFORM create_activity(
      NEW.user_id,
      workspace_id,
      'created',
      'page',
      NEW.id,
      NEW.title
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.title != NEW.title THEN
      PERFORM create_activity(
        NEW.user_id,
        workspace_id,
        'updated',
        'page',
        NEW.id,
        NEW.title,
        jsonb_build_object('old_title', OLD.title, 'new_title', NEW.title)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_activity(
      OLD.user_id,
      workspace_id,
      'deleted',
      'page',
      OLD.id,
      OLD.title
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER page_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION create_page_activity();

-- Create block activity trigger
CREATE OR REPLACE FUNCTION create_block_activity()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id UUID;
  page_title TEXT;
BEGIN
  -- Get workspace_id and page title
  SELECT p.workspace_id, p.title INTO workspace_id, page_title
  FROM pages p
  WHERE p.id = COALESCE(NEW.page_id, OLD.page_id);
  
  -- Create activity based on operation
  IF TG_OP = 'INSERT' THEN
    PERFORM create_activity(
      (SELECT user_id FROM pages WHERE id = NEW.page_id),
      workspace_id,
      'created',
      'block',
      NEW.id,
      page_title,
      jsonb_build_object('block_type', NEW.type)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.content != NEW.content OR OLD.type != NEW.type THEN
      PERFORM create_activity(
        (SELECT user_id FROM pages WHERE id = NEW.page_id),
        workspace_id,
        'updated',
        'block',
        NEW.id,
        page_title,
        jsonb_build_object('block_type', NEW.type)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_activity(
      (SELECT user_id FROM pages WHERE id = OLD.page_id),
      workspace_id,
      'deleted',
      'block',
      OLD.id,
      page_title,
      jsonb_build_object('block_type', OLD.type)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON blocks
  FOR EACH ROW
  EXECUTE FUNCTION create_block_activity();
