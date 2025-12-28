-- Enable pg_trgm extension for fuzzy search (trigram similarity)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indexes for fuzzy search on pages
CREATE INDEX IF NOT EXISTS idx_pages_title_trgm ON pages USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_blocks_content_trgm ON blocks USING GIN (content gin_trgm_ops);

-- Improved fuzzy search function for blocks with typo tolerance
CREATE OR REPLACE FUNCTION search_blocks_fuzzy(
  search_query TEXT,
  workspace_filter UUID DEFAULT NULL,
  block_type_filter TEXT DEFAULT NULL,
  similarity_threshold REAL DEFAULT 0.3,
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
    GREATEST(
      similarity(b.content, search_query),
      similarity(b.content, search_query || '%'),
      similarity(b.content, '%' || search_query)
    ) as rank
  FROM blocks b
  JOIN pages p ON b.page_id = p.id
  WHERE
    (
      similarity(b.content, search_query) > similarity_threshold
      OR similarity(b.content, search_query || '%') > similarity_threshold
      OR similarity(b.content, '%' || search_query) > similarity_threshold
      OR b.content ILIKE '%' || search_query || '%'
    )
    AND (workspace_filter IS NULL OR p.workspace_id = workspace_filter)
    AND (block_type_filter IS NULL OR b.type = block_type_filter)
  ORDER BY rank DESC, b.created_at DESC
  LIMIT limit_count;
$$;

-- Improved fuzzy search function for pages with typo tolerance
CREATE OR REPLACE FUNCTION search_pages_fuzzy(
  search_query TEXT,
  workspace_filter UUID DEFAULT NULL,
  similarity_threshold REAL DEFAULT 0.3,
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
    GREATEST(
      similarity(p.title, search_query),
      similarity(p.title, search_query || '%'),
      similarity(p.title, '%' || search_query)
    ) as rank
  FROM pages p
  WHERE
    (
      similarity(p.title, search_query) > similarity_threshold
      OR similarity(p.title, search_query || '%') > similarity_threshold
      OR similarity(p.title, '%' || search_query) > similarity_threshold
      OR p.title ILIKE '%' || search_query || '%'
    )
    AND (workspace_filter IS NULL OR p.workspace_id = workspace_filter)
  ORDER BY rank DESC, p.updated_at DESC
  LIMIT limit_count;
$$;

-- Combined fuzzy search function (uses both exact and fuzzy matching)
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
  -- First try exact full-text search (higher priority)
  SELECT
    b.id,
    b.page_id,
    b.type,
    b.content,
    b.metadata,
    p.title as page_title,
    ts_rank(b.content_tsv, plainto_tsquery('portuguese', search_query)) * 2.0 as rank
  FROM blocks b
  JOIN pages p ON b.page_id = p.id
  WHERE
    b.content_tsv @@ plainto_tsquery('portuguese', search_query)
    AND (workspace_filter IS NULL OR p.workspace_id = workspace_filter)
    AND (block_type_filter IS NULL OR b.type = block_type_filter)
  
  UNION ALL
  
  -- Then add fuzzy matches (lower priority)
  SELECT
    b.id,
    b.page_id,
    b.type,
    b.content,
    b.metadata,
    p.title as page_title,
    similarity(b.content, search_query) * 0.5 as rank
  FROM blocks b
  JOIN pages p ON b.page_id = p.id
  WHERE
    similarity(b.content, search_query) > 0.3
    AND (workspace_filter IS NULL OR p.workspace_id = workspace_filter)
    AND (block_type_filter IS NULL OR b.type = block_type_filter)
    AND b.id NOT IN (
      SELECT id FROM blocks b2
      JOIN pages p2 ON b2.page_id = p2.id
      WHERE b2.content_tsv @@ plainto_tsquery('portuguese', search_query)
    )
  
  ORDER BY rank DESC, created_at DESC
  LIMIT limit_count;
$$;

-- Improved page search with fuzzy matching
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
  -- Exact matches first (highest priority)
  SELECT
    p.id,
    p.title,
    CASE 
      WHEN p.title ILIKE search_query THEN 1.0
      WHEN p.title ILIKE search_query || '%' THEN 0.9
      WHEN p.title ILIKE '%' || search_query THEN 0.8
      ELSE similarity(p.title, search_query)
    END as rank
  FROM pages p
  WHERE
    (
      p.title ILIKE '%' || search_query || '%'
      OR similarity(p.title, search_query) > 0.2
    )
    AND (workspace_filter IS NULL OR p.workspace_id = workspace_filter)
  ORDER BY rank DESC, p.updated_at DESC
  LIMIT limit_count;
$$;
