-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PDFs storage table
CREATE TABLE IF NOT EXISTS public.pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Knowledge Graphs table
CREATE TABLE IF NOT EXISTS public.knowledge_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_graph_id UUID NOT NULL REFERENCES public.knowledge_graphs(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- 'gateway', 'conceptual', 'analytical', 'practical'
  pillar VARCHAR(50), -- for 3-pillar assessments
  difficulty_level INT DEFAULT 1, -- 1-5
  concepts JSONB DEFAULT '[]', -- related concepts from KG
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Assessments table
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  assessment_type VARCHAR(50) NOT NULL, -- 'gateway', 'conceptual', 'analytical', 'practical'
  status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed'
  score DECIMAL(5, 2),
  total_questions INT,
  correct_answers INT,
  time_taken_seconds INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Assessment Answers table
CREATE TABLE IF NOT EXISTS public.assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN,
  time_taken_seconds INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Learning Progress table
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id UUID NOT NULL REFERENCES public.pdfs(id) ON DELETE CASCADE,
  gateway_passed BOOLEAN DEFAULT FALSE,
  conceptual_score DECIMAL(5, 2),
  analytical_score DECIMAL(5, 2),
  practical_score DECIMAL(5, 2),
  overall_score DECIMAL(5, 2),
  last_assessment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Allow users to view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Allow users to insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- PDFs RLS policies
CREATE POLICY "Allow users to view their own PDFs"
  ON public.pdfs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to create PDFs"
  ON public.pdfs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own PDFs"
  ON public.pdfs FOR DELETE
  USING (auth.uid() = user_id);

-- Knowledge Graphs RLS policies (accessible through PDF)
CREATE POLICY "Allow users to view KG for their PDFs"
  ON public.knowledge_graphs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pdfs
      WHERE pdfs.id = knowledge_graphs.pdf_id
      AND pdfs.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow service role to create KG"
  ON public.knowledge_graphs FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR 
    EXISTS (
      SELECT 1 FROM public.pdfs
      WHERE pdfs.id = knowledge_graphs.pdf_id
      AND pdfs.user_id = auth.uid()
    )
  );

-- Questions RLS policies
CREATE POLICY "Allow users to view questions for their PDFs"
  ON public.questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.knowledge_graphs kg
      JOIN public.pdfs p ON kg.pdf_id = p.id
      WHERE kg.id = questions.knowledge_graph_id
      AND p.user_id = auth.uid()
    )
  );

-- Assessments RLS policies
CREATE POLICY "Allow users to view their own assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to create assessments"
  ON public.assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own assessments"
  ON public.assessments FOR UPDATE
  USING (auth.uid() = user_id);

-- Assessment Answers RLS policies
CREATE POLICY "Allow users to view their own answers"
  ON public.assessment_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments
      WHERE assessments.id = assessment_answers.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow users to create answers"
  ON public.assessment_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessments
      WHERE assessments.id = assessment_answers.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

-- Learning Progress RLS policies
CREATE POLICY "Allow users to view their own progress"
  ON public.learning_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Allow users to create progress"
  ON public.learning_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own progress"
  ON public.learning_progress FOR UPDATE
  USING (auth.uid() = user_id);
