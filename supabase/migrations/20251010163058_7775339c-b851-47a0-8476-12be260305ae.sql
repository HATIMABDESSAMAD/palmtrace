-- Create the reporting table for combined tree and parcel data
CREATE TABLE IF NOT EXISTS public.parcels_trees_report (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel integer NOT NULL,
  bloc integer NOT NULL,
  sector integer NOT NULL,
  row integer NOT NULL,
  col integer NOT NULL,
  longitude double precision,
  latitude double precision,
  variete text,
  date_de_plantation text,
  superficie_du_bloc text,
  nombre_de_regimes_22_23 integer,
  nombre_de_regimes_23_24 integer,
  nombre_de_regimes_24_25 integer,
  nombre_de_regimes_25_26 integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(bloc, sector, parcel, row, col)
);

-- Enable RLS
ALTER TABLE public.parcels_trees_report ENABLE ROW LEVEL SECURITY;

-- Create policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can read report data" ON public.parcels_trees_report;
DROP POLICY IF EXISTS "Anyone can insert report data" ON public.parcels_trees_report;
DROP POLICY IF EXISTS "Anyone can update report data" ON public.parcels_trees_report;

CREATE POLICY "Anyone can read report data"
  ON public.parcels_trees_report
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert report data"
  ON public.parcels_trees_report
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update report data"
  ON public.parcels_trees_report
  FOR UPDATE
  USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_parcels_trees_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_parcels_trees_report_timestamp ON public.parcels_trees_report;

CREATE TRIGGER update_parcels_trees_report_timestamp
  BEFORE UPDATE ON public.parcels_trees_report
  FOR EACH ROW
  EXECUTE FUNCTION public.update_parcels_trees_report_updated_at();