-- Add column for regimes_21_22 to parcels_trees_report table
ALTER TABLE public.parcels_trees_report 
ADD COLUMN IF NOT EXISTS nombre_de_regimes_21_22 integer;