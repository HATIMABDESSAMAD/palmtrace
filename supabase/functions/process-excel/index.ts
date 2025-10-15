import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TreeRecord {
  bloc: number;
  sector: number;
  parcel: number;
  row: number;
  col: number;
  variete: string;
  date_de_plantation: string;
  superficie_du_bloc: string;
  nombre_de_regimes_21_22: number | null;
  nombre_de_regimes_22_23: number | null;
  nombre_de_regimes_23_24: number | null;
  nombre_de_regimes_24_25: number | null;
  nombre_de_regimes_25_26: number | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and check admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client with anon key to verify user
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized: Invalid token');
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await authClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Forbidden: Admin access required');
    }

    console.log(`Admin user ${user.email} authenticated for operation`);

    // Use service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Handle delete action
    if (action === 'delete') {
      const { uploadId } = await req.json();
      
      console.log(`Deleting upload: ${uploadId}`);
      
      const { error } = await supabase
        .from('excel_uploads')
        .delete()
        .eq('id', uploadId);
      
      if (error) {
        throw new Error(`Failed to delete upload: ${error.message}`);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Upload deleted successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Handle clear all action
    if (action === 'clear-all') {
      console.log('Clearing all data from parcels_trees_report table');
      
      const { error: deleteError } = await supabase
        .from('parcels_trees_report')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (deleteError) {
        throw new Error(`Failed to clear table: ${deleteError.message}`);
      }

      const { error: uploadsError } = await supabase
        .from('excel_uploads')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all upload records
      
      if (uploadsError) {
        throw new Error(`Failed to clear uploads: ${uploadsError.message}`);
      }
      
      console.log('Successfully cleared all data');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All data cleared successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Handle upload/process action
    console.log('Processing parsed Excel data...');

    // Get the parsed data from the request
    const { 
      records, 
      filename, 
      uploadId: existingUploadId,
      chunkNumber,
      totalChunks,
      isLastChunk 
    }: { 
      records: TreeRecord[]; 
      filename: string;
      uploadId?: string;
      chunkNumber?: number;
      totalChunks?: number;
      isLastChunk?: boolean;
    } = await req.json();
    
    if (!records || records.length === 0) {
      throw new Error('No records provided');
    }

    let uploadRecord: any;

    // If this is a chunk upload and we have an existing uploadId, use it
    if (existingUploadId) {
      console.log(`Processing chunk ${chunkNumber}/${totalChunks} for upload ${existingUploadId}`);
      
      const { data, error } = await supabase
        .from('excel_uploads')
        .select()
        .eq('id', existingUploadId)
        .single();
      
      if (error || !data) {
        throw new Error(`Failed to find upload record: ${error?.message}`);
      }
      
      uploadRecord = data;
    } else {
      // Create new upload record for first chunk or single upload
      const { data, error: uploadError } = await supabase
        .from('excel_uploads')
        .insert({
          filename: filename || 'unknown.xlsx',
          total_records: 0, // Will be updated as chunks arrive
          status: 'processing'
        })
        .select()
        .single();

      if (uploadError || !data) {
        throw new Error(`Failed to create upload record: ${uploadError?.message}`);
      }

      uploadRecord = data;
      console.log(`Created upload record ${uploadRecord.id} for chunk upload`);
    }
    
    let totalProcessed = 0;
    let totalErrors = 0;
    
    // Process records in batches
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      // Enrich each record with lat/long from trees table and filter valid ones
      const enrichedBatch = await Promise.all(
        batch.map(async (record) => {
          // First, get parcel_id
          const { data: parcelData } = await supabase
            .from('parcels')
            .select('id')
            .eq('block_number', record.bloc)
            .eq('sector_number', record.sector)
            .eq('parcel_number', record.parcel)
            .maybeSingle();
          
          if (!parcelData) {
            console.warn(`Skipping - Parcel not found: B${record.bloc}S${record.sector}P${record.parcel} R${record.row}C${record.col}`);
            return null; // Mark as invalid
          }
          
          // Then get tree lat/long
          const { data: treeData } = await supabase
            .from('trees')
            .select('latitude, longitude')
            .eq('parcel_id', parcelData.id)
            .eq('row_index', record.row)
            .eq('col_index', record.col)
            .maybeSingle();
          
          if (!treeData) {
            console.warn(`Skipping - Tree not found in trees table: B${record.bloc}S${record.sector}P${record.parcel} R${record.row}C${record.col}`);
            return null; // Mark as invalid
          }
          
          return {
            ...record,
            longitude: treeData.longitude,
            latitude: treeData.latitude,
            upload_id: uploadRecord.id,
          };
        })
      );
      
      // Filter out invalid records (nulls)
      const validRecords = enrichedBatch.filter((record): record is NonNullable<typeof record> => record !== null);
      const skippedCount = batch.length - validRecords.length;
      
      if (skippedCount > 0) {
        console.log(`Skipped ${skippedCount} records (trees not in trees table)`);
        totalErrors += skippedCount;
      }
      
      // Only upsert if we have valid records
      if (validRecords.length > 0) {
        const { error: upsertError } = await supabase
          .from('parcels_trees_report')
          .upsert(validRecords, {
            onConflict: 'bloc,sector,parcel,row,col',
            ignoreDuplicates: false,
          });
        
        if (upsertError) {
          console.error(`Error upserting batch:`, upsertError);
          totalErrors += validRecords.length;
        } else {
          console.log(`Successfully processed batch of ${validRecords.length} records`);
          totalProcessed += validRecords.length;
        }
      }
    }
    
    
    console.log(`Total processed: ${totalProcessed}, Total errors: ${totalErrors}`);
    
    // Update upload record with new total
    const { data: currentUpload } = await supabase
      .from('excel_uploads')
      .select('total_records')
      .eq('id', uploadRecord.id)
      .single();
    
    const newTotal = (currentUpload?.total_records || 0) + totalProcessed;
    
    await supabase
      .from('excel_uploads')
      .update({ 
        total_records: newTotal,
        status: isLastChunk ? 'completed' : 'processing'
      })
      .eq('id', uploadRecord.id);
    
    console.log(`Updated upload ${uploadRecord.id}: ${newTotal} total records, status: ${isLastChunk ? 'completed' : 'processing'}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${totalProcessed} records (chunk ${chunkNumber || 1}/${totalChunks || 1})`,
        totalProcessed,
        totalErrors,
        uploadId: uploadRecord.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing Excel data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});