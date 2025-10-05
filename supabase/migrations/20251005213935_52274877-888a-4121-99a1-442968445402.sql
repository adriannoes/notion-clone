-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create pages table
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  is_favorite BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on pages
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Pages policies
CREATE POLICY "Users can view own pages"
  ON public.pages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pages"
  ON public.pages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pages"
  ON public.pages
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pages"
  ON public.pages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create blocks table
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  parent_block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on blocks
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Blocks policies (check ownership through pages table)
CREATE POLICY "Users can view blocks of own pages"
  ON public.blocks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pages
      WHERE pages.id = blocks.page_id
      AND pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert blocks on own pages"
  ON public.blocks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pages
      WHERE pages.id = blocks.page_id
      AND pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update blocks of own pages"
  ON public.blocks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pages
      WHERE pages.id = blocks.page_id
      AND pages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete blocks of own pages"
  ON public.blocks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.pages
      WHERE pages.id = blocks.page_id
      AND pages.user_id = auth.uid()
    )
  );

-- Create templates table
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Users can view public templates"
  ON public.templates
  FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON public.templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.templates
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at
  BEFORE UPDATE ON public.blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default public templates
INSERT INTO public.templates (name, description, blocks, is_public) VALUES
('Blank', 'Start with an empty page', '[]'::jsonb, true),
('Meeting Notes', 'Template for meeting notes', '[{"type":"heading1","content":"Meeting Notes"},{"type":"paragraph","content":"Date: "},{"type":"paragraph","content":"Attendees: "},{"type":"heading2","content":"Agenda"},{"type":"bulletList","content":""},{"type":"heading2","content":"Action Items"},{"type":"bulletList","content":""}]'::jsonb, true),
('Project Plan', 'Organize your project', '[{"type":"heading1","content":"Project Plan"},{"type":"heading2","content":"Overview"},{"type":"paragraph","content":""},{"type":"heading2","content":"Goals"},{"type":"bulletList","content":""},{"type":"heading2","content":"Timeline"},{"type":"paragraph","content":""},{"type":"heading2","content":"Resources"},{"type":"bulletList","content":""}]'::jsonb, true),
('Weekly Review', 'Reflect on your week', '[{"type":"heading1","content":"Weekly Review"},{"type":"heading2","content":"Wins"},{"type":"bulletList","content":""},{"type":"heading2","content":"Challenges"},{"type":"bulletList","content":""},{"type":"heading2","content":"Next Week"},{"type":"bulletList","content":""}]'::jsonb, true),
('Documentation', 'Technical documentation template', '[{"type":"heading1","content":"Documentation"},{"type":"heading2","content":"Overview"},{"type":"paragraph","content":""},{"type":"heading2","content":"Getting Started"},{"type":"paragraph","content":""},{"type":"heading2","content":"API Reference"},{"type":"paragraph","content":""},{"type":"heading2","content":"Examples"},{"type":"code","content":"","metadata":{"language":"javascript"}}]'::jsonb, true);