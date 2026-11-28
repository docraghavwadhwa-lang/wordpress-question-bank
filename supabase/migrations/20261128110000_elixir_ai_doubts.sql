-- Elixir AI: Grounded MBBS Doubt Solver Schema
-- Compact 768-dimensional embeddings, document registry, chunks, caching, and RLS

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Curated Study Documents Registry
CREATE TABLE IF NOT EXISTS public.study_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  drive_file_id TEXT,
  file_hash TEXT UNIQUE,
  total_chunks INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Study Chunks with 768d vector / halfvec representation
-- Tries halfvec(768) first for 50% storage savings; falls back to vector(768) if halfvec is unavailable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'study_chunks') THEN
    BEGIN
      CREATE TABLE public.study_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES public.study_documents(id) ON DELETE CASCADE,
        chunk_index INT NOT NULL,
        subject TEXT NOT NULL,
        topic TEXT NOT NULL,
        content TEXT NOT NULL,
        token_count INT DEFAULT 0,
        embedding halfvec(768),
        created_at TIMESTAMPTZ DEFAULT now()
      );
    EXCEPTION WHEN undefined_object OR syntax_error THEN
      CREATE TABLE public.study_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES public.study_documents(id) ON DELETE CASCADE,
        chunk_index INT NOT NULL,
        subject TEXT NOT NULL,
        topic TEXT NOT NULL,
        content TEXT NOT NULL,
        token_count INT DEFAULT 0,
        embedding vector(768),
        created_at TIMESTAMPTZ DEFAULT now()
      );
    END;
  END IF;
END $$;

-- 4. Vector and Metadata Indexes
DO $$
BEGIN
  -- Create HNSW index on embeddings for fast cosine similarity search
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'study_chunks' AND column_name = 'embedding'
  ) THEN
    BEGIN
      CREATE INDEX IF NOT EXISTS idx_study_chunks_embedding_halfvec 
      ON public.study_chunks USING hnsw (embedding halfvec_cosine_ops) 
      WITH (m = 16, ef_construction = 64);
    EXCEPTION WHEN undefined_object OR syntax_error OR undefined_function THEN
      CREATE INDEX IF NOT EXISTS idx_study_chunks_embedding_vector 
      ON public.study_chunks USING hnsw (embedding vector_cosine_ops) 
      WITH (m = 16, ef_construction = 64);
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_study_chunks_document_id ON public.study_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_study_chunks_subject ON public.study_chunks(subject);

-- 5. Query & Response Cache (Protects free-tier API rate limits and accelerates repeated questions)
CREATE TABLE IF NOT EXISTS public.doubt_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT UNIQUE NOT NULL,
  normalized_query TEXT NOT NULL,
  subject_filter TEXT,
  answer TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  hit_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_doubt_cache_hash ON public.doubt_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_doubt_cache_expires ON public.doubt_cache(expires_at);

-- 6. Match RPC Function (Returns joined document_title directly for zero client overhead)
-- Supports vector(768) and halfvec(768) dynamically
CREATE OR REPLACE FUNCTION public.match_study_chunks (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.65,
  match_count int DEFAULT 4,
  filter_subject text DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  subject TEXT,
  topic TEXT,
  content TEXT,
  document_title TEXT,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.subject,
    sc.topic,
    sc.content,
    sd.title AS document_title,
    (1 - (sc.embedding <=> query_embedding))::float AS similarity
  FROM public.study_chunks sc
  JOIN public.study_documents sd ON sc.document_id = sd.id
  WHERE (filter_subject IS NULL OR sc.subject ILIKE filter_subject)
    AND (1 - (sc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. Enable Row-Level Security (RLS) across all AI knowledge tables
ALTER TABLE public.study_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_cache ENABLE ROW LEVEL SECURITY;

-- Anonymous users cannot dump raw chunks or cache records
-- Authenticated users can read document metadata
CREATE POLICY "Allow authenticated read study_documents"
  ON public.study_documents
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users access chunks solely via the match_study_chunks security-definer function
-- Service role retains full administrative access for ingestion and maintenance
CREATE POLICY "Allow service_role full access study_documents"
  ON public.study_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service_role full access study_chunks"
  ON public.study_chunks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service_role full access doubt_cache"
  ON public.doubt_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can query doubt cache for instant hits
CREATE POLICY "Allow authenticated read doubt_cache"
  ON public.doubt_cache
  FOR SELECT
  TO authenticated
  USING (expires_at > now());
