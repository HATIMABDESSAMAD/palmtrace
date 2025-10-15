import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { addLog } from "./ErrorConsole";

export const ExcelUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls")) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an Excel file (.xlsx or .xls)",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file first",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const CHUNK_SIZE = 1000; // Process 1000 records at a time

    try {
      // Read and parse Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      console.log(`Found ${workbook.SheetNames.length} sheets`);

      const records = [];

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        console.log(`Processing sheet: ${sheetName}`);

        // Parse sheet name format: B{bloc}S{sector}P{parcel}
        const match = sheetName.match(/B(\d+)S(\d+)P(\d+)/);
        if (!match) {
          console.log(`Skipping sheet ${sheetName} - invalid format`);
          continue;
        }

        const bloc = parseInt(match[1]);
        const sector = parseInt(match[2]);
        const parcel = parseInt(match[3]);

        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];

        // Extract metadata from first rows
        const dateDePlantation = data[0]?.[2] || "";
        const superficie = data[1]?.[2] || "";

        console.log(`Bloc ${bloc}, Sector ${sector}, Parcel ${parcel}`);
        console.log(`Metadata: ${dateDePlantation}, ${superficie}`);

        // Process trees (20 rows x 20 columns)
        // Row index formula: 5 + (i-1) + j + 1 where i,j are 1-indexed
        for (let i = 1; i <= 20; i++) {
          for (let j = 1; j <= 20; j++) {
            const idx = 5 + 20 * (i - 1) + j;

            // Extract data from columns (1-indexed col 3 = 0-indexed col 2, etc.)
            const variete = String(data[idx]?.[2] || ""); // Column 3 (1-indexed)
            const regimes_21_22 = parseInt(String(data[idx]?.[3] || "")) || null; // Column 4
            const regimes_22_23 = parseInt(String(data[idx]?.[4] || "")) || null; // Column 5
            const regimes_23_24 = parseInt(String(data[idx]?.[5] || "")) || null; // Column 6
            const regimes_24_25 = parseInt(String(data[idx]?.[6] || "")) || null; // Column 7
            const regimes_25_26 = parseInt(String(data[idx]?.[7] || "")) || null; // Column 8

            records.push({
              bloc,
              sector,
              parcel,
              row: i,
              col: j,
              variete: variete,
              date_de_plantation: String(dateDePlantation),
              superficie_du_bloc: String(superficie),
              nombre_de_regimes_22_23: regimes_22_23,
              nombre_de_regimes_23_24: regimes_23_24,
              nombre_de_regimes_24_25: regimes_24_25,
              nombre_de_regimes_25_26: regimes_25_26,
            });
          }
        }
      }

      console.log(`Extracted ${records.length} tree records`);
      addLog("info", `Processing ${records.length} records in chunks of ${CHUNK_SIZE}...`);

      // Send parsed data to edge function in chunks
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const totalChunks = Math.ceil(records.length / CHUNK_SIZE);
      let uploadId: string | null = null;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, records.length);
        const chunk = records.slice(start, end);
        const isLastChunk = i === totalChunks - 1;

        addLog("info", `Uploading chunk ${i + 1}/${totalChunks} (${chunk.length} records)...`);

        if (!session?.access_token) {
          throw new Error('Authentication required');
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-excel`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            records: chunk,
            filename: file.name,
            uploadId: uploadId,
            chunkNumber: i + 1,
            totalChunks: totalChunks,
            isLastChunk: isLastChunk,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          const errorDetails = {
            status: response.status,
            statusText: response.statusText,
            body: result,
            fileName: file.name,
            chunk: `${i + 1}/${totalChunks}`,
            timestamp: new Date().toISOString(),
          };
          addLog(
            "error",
            `Upload failed at chunk ${i + 1}/${totalChunks} (${response.status})`,
            JSON.stringify(errorDetails, null, 2),
          );
          throw new Error(result.message || result.error || `Server error: ${response.status}`);
        }

        if (!result.success) {
          throw new Error(result.error);
        }

        // Store the upload ID from the first chunk
        if (i === 0 && result.uploadId) {
          uploadId = result.uploadId;
        }

        addLog("info", `Chunk ${i + 1}/${totalChunks} completed successfully`);
      }

      addLog("info", `Successfully uploaded all ${records.length} records`);
      toast({
        title: "Success!",
        description: `Processed ${records.length} records in ${totalChunks} chunks`,
      });
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById("excel-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process Excel file";
      const errorDetails = {
        error: errorMessage,
        fileName: file?.name,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
      };
      console.error("❌ UPLOAD ERROR:", errorDetails);
      addLog("error", errorMessage, JSON.stringify(errorDetails, null, 2));
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import Excel Data
        </CardTitle>
        <CardDescription>
          Upload Excel files to extract tree and parcel data into the reporting database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="excel-file">Select Excel File</Label>
          <Input id="excel-file" type="file" accept=".xlsx,.xls" onChange={handleFileChange} disabled={isUploading} />
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </div>
          )}
        </div>

        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Excel Format Requirements:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
            <li>
              Sheet names must follow format: B{"{bloc}"}S{"{sector}"}P{"{parcel}"}
            </li>
            <li>Example: B1S1P1, B2S3P5</li>
            <li>Data will be merged with existing tree geolocation data</li>
            <li>Duplicate entries will be updated, not duplicated</li>
          </ul>
        </div>

        <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
          {isUploading ? (
            <>Processing...</>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload and Process
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
