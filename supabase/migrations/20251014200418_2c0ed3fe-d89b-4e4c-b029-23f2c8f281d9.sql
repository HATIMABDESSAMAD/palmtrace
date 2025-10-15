-- Drop all overly permissive RLS policies
DROP POLICY IF EXISTS "Anyone can read parcels" ON public.parcels;
DROP POLICY IF EXISTS "Anyone can insert parcels" ON public.parcels;
DROP POLICY IF EXISTS "Anyone can read trees" ON public.trees;
DROP POLICY IF EXISTS "Anyone can insert trees" ON public.trees;
DROP POLICY IF EXISTS "Anyone can read uploads" ON public.excel_uploads;
DROP POLICY IF EXISTS "Anyone can insert uploads" ON public.excel_uploads;
DROP POLICY IF EXISTS "Anyone can delete uploads" ON public.excel_uploads;
DROP POLICY IF EXISTS "Anyone can read report data" ON public.parcels_trees_report;
DROP POLICY IF EXISTS "Anyone can insert report data" ON public.parcels_trees_report;
DROP POLICY IF EXISTS "Anyone can update report data" ON public.parcels_trees_report;

-- Create authenticated-only read policies
CREATE POLICY "Authenticated users can read parcels" 
ON public.parcels 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can read trees" 
ON public.trees 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can read uploads" 
ON public.excel_uploads 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can read report data" 
ON public.parcels_trees_report 
FOR SELECT 
TO authenticated 
USING (true);

-- Create admin-only write policies for parcels
CREATE POLICY "Admins can insert parcels" 
ON public.parcels 
FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update parcels" 
ON public.parcels 
FOR UPDATE 
TO authenticated 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete parcels" 
ON public.parcels 
FOR DELETE 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- Create admin-only write policies for trees
CREATE POLICY "Admins can insert trees" 
ON public.trees 
FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update trees" 
ON public.trees 
FOR UPDATE 
TO authenticated 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete trees" 
ON public.trees 
FOR DELETE 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- Create admin-only write policies for excel_uploads
CREATE POLICY "Admins can insert uploads" 
ON public.excel_uploads 
FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update uploads" 
ON public.excel_uploads 
FOR UPDATE 
TO authenticated 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete uploads" 
ON public.excel_uploads 
FOR DELETE 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- Create admin-only write policies for parcels_trees_report
CREATE POLICY "Admins can insert report data" 
ON public.parcels_trees_report 
FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update report data" 
ON public.parcels_trees_report 
FOR UPDATE 
TO authenticated 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete report data" 
ON public.parcels_trees_report 
FOR DELETE 
TO authenticated 
USING (public.is_admin(auth.uid()));