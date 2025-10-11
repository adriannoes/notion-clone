-- Create workspace invites table
CREATE TABLE workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX idx_workspace_invites_workspace ON workspace_invites(workspace_id);
CREATE INDEX idx_workspace_invites_email ON workspace_invites(email);

-- Enable RLS
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace invites
CREATE POLICY "Users can view invites for their workspaces"
  ON workspace_invites FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can create invites if admin+"
  ON workspace_invites FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update invites if admin+"
  ON workspace_invites FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete invites if admin+"
  ON workspace_invites FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Function to generate unique token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a random token
  token := encode(gen_random_bytes(32), 'base64url');
  
  -- Ensure token is unique
  WHILE EXISTS (SELECT 1 FROM workspace_invites WHERE token = token) LOOP
    token := encode(gen_random_bytes(32), 'base64url');
  END LOOP;
  
  RETURN token;
END;
$$;

-- Function to clean up expired invites (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM workspace_invites 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
