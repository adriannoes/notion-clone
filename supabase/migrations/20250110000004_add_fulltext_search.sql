-- Add full-text search column to blocks table
ALTER TABLE blocks
ADD COLUMN content_tsv tsvector
GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED;

-- Create GIN index for full-text search
CREATE INDEX idx_blocks_fts ON blocks USING GIN(content_tsv);

-- Create index for faster searches by workspace
CREATE INDEX idx_blocks_workspace_page ON blocks(workspace_id, page_id);

-- Function for advanced search with filters
CREATE OR REPLACE FUNCTION search_blocks_advanced(
  search_query TEXT,
  workspace_filter UUID DEFAULT NULL,
  block_type_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  page_id UUID,
  type TEXT,
  content TEXT,
  metadata JSONB,
  page_title TEXT,
  rank REAL
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.page_id,
    b.type,
    b.content,
    b.metadata,
    p.title as page_title,
    ts_rank(b.content_tsv, plainto_tsquery('portuguese', search_query)) as rank
  FROM blocks b
  JOIN pages p ON b.page_id = p.id
  WHERE
    b.content_tsv @@ plainto_tsquery('portuguese', search_query)
    AND (workspace_filter IS NULL OR p.workspace_id = workspace_filter)
    AND (block_type_filter IS NULL OR b.type = block_type_filter)
  ORDER BY rank DESC, b.created_at DESC
  LIMIT limit_count;
$$;

-- Function to search pages by title
CREATE OR REPLACE FUNCTION search_pages_by_title(
  search_query TEXT,
  workspace_filter UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  rank REAL
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.title,
    similarity(p.title, search_query) as rank
  FROM pages p
  WHERE
    similarity(p.title, search_query) > 0.1
    AND (workspace_filter IS NULL OR p.workspace_id = workspace_filter)
  ORDER BY rank DESC, p.updated_at DESC
  LIMIT limit_count;
$$;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
  search_query TEXT,
  workspace_filter UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE(
  suggestion TEXT,
  type TEXT,
  count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Get suggestions from page titles
  SELECT
    p.title as suggestion,
    'page' as type,
    COUNT(*) as count
  FROM pages p
  WHERE
    p.title ILIKE '%' || search_query || '%'
    AND (workspace_filter IS NULL OR p.workspace_id = workspace_filter)
  GROUP BY p.title
  HAVING COUNT(*) > 0
  ORDER BY COUNT(*) DESC, LENGTH(p.title) ASC
  LIMIT limit_count

  UNION ALL

  -- Get suggestions from block content
  SELECT
    b.content as suggestion,
    'block' as type,
    COUNT(*) as count
  FROM blocks b
  JOIN pages p ON b.page_id = p.id
  WHERE
    b.content ILIKE '%' || search_query || '%'
    AND (workspace_filter IS NULL OR p.workspace_id = workspace_filter)
  GROUP BY b.content
  HAVING COUNT(*) > 0
  ORDER BY COUNT(*) DESC, LENGTH(b.content) ASC
  LIMIT limit_count;
$$;
