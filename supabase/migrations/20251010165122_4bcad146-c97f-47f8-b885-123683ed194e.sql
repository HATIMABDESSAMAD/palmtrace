-- Create table to track Excel upload history
CREATE TABLE public.excel_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename text NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  total_records integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed'
);

-- Enable RLS
ALTER TABLE public.excel_uploads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read and insert uploads
CREATE POLICY "Anyone can read uploads"
  ON public.excel_uploads
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert uploads"
  ON public.excel_uploads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete uploads"
  ON public.excel_uploads
  FOR DELETE
  USING (true);

-- Add upload_id column to parcels_trees_report to link records to uploads
ALTER TABLE public.parcels_trees_report
  ADD COLUMN upload_id uuid REFERENCES public.excel_uploads(id) ON DELETE CASCADE;