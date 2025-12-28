-- Add 'gallery' as a valid view type
ALTER TABLE database_views
DROP CONSTRAINT IF EXISTS database_views_view_type_check;

ALTER TABLE database_views
ADD CONSTRAINT database_views_view_type_check 
CHECK (view_type IN ('table', 'kanban', 'calendar', 'gallery'));
