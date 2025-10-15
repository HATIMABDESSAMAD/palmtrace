import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { addLog } from './ErrorConsole';

export const ClearDataButton = () => {
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-excel?action=clear-all`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        addLog('info', 'All data cleared from database');
        toast({
          title: "Cleared",
          description: "All data has been removed from the database",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to clear data";
      const errorDetails = {
        error: errorMessage,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined
      };
      console.error('❌ CLEAR ALL ERROR:', errorDetails);
      addLog('error', errorMessage, JSON.stringify(errorDetails, null, 2));
      toast({
        title: "Clear failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm"
          disabled={isClearing}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-md">
              <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold text-destructive">Warning: This is irreversible!</p>
                <p className="text-sm">This will permanently delete:</p>
              </div>
            </div>
            <ul className="list-disc list-inside pl-4 space-y-1 text-sm">
              <li>All tree records from parcels_trees_report table</li>
              <li>All upload history</li>
              <li>All associated data</li>
            </ul>
            <p className="text-sm font-medium pt-2">
              This action cannot be undone. Are you sure you want to continue?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearAll}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, Clear Everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
