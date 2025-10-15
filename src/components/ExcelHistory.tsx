import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, History, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ClearDataButton } from "./ClearDataButton";

interface ExcelUpload {
  id: string;
  filename: string;
  uploaded_at: string;
  total_records: number;
  status: string;
}

export const ExcelHistory = () => {
  const [uploads, setUploads] = useState<ExcelUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUploads = async () => {
    try {
      const { data, error } = await supabase
        .from('excel_uploads')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setUploads(data || []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch upload history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUploads();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('excel_uploads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'excel_uploads'
        },
        () => {
          fetchUploads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (uploadId: string) => {
    setDeletingId(uploadId);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-excel?action=delete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uploadId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Deleted",
          description: "Upload and all associated records have been deleted",
        });
        fetchUploads();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete upload";
      console.error('❌ DELETE ERROR:', {
        error: errorMessage,
        uploadId,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined
      });
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Upload History
            </CardTitle>
            <CardDescription>
              View and manage Excel file uploads
            </CardDescription>
          </div>
          <ClearDataButton />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : uploads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No uploads yet
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="font-medium">{upload.filename}</TableCell>
                    <TableCell>{formatDate(upload.uploaded_at)}</TableCell>
                    <TableCell className="text-right">{upload.total_records}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        upload.status === 'completed' 
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {upload.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === upload.id}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Upload?</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p>This will permanently delete:</p>
                              <ul className="list-disc list-inside pl-4 space-y-1">
                                <li><strong>{upload.filename}</strong></li>
                                <li>{upload.total_records} tree records from the database</li>
                              </ul>
                              <div className="flex items-center gap-2 mt-4 p-3 bg-destructive/10 rounded-md">
                                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                                <p className="text-sm">This action cannot be undone.</p>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(upload.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
