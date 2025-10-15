-- Create parcels table
CREATE TABLE public.parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_number INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  sector_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parcel_number, block_number, sector_number)
);

-- Create trees table
CREATE TABLE public.trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE NOT NULL,
  tree_id TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  col_index INTEGER NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth needed)
CREATE POLICY "Anyone can read parcels"
  ON public.parcels FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert parcels"
  ON public.parcels FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read trees"
  ON public.trees FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert trees"
  ON public.trees FOR INSERT
  WITH CHECK (true);