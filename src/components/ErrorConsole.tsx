import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, X, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'error' | 'info' | 'warning';
  message: string;
  details?: string;
}

let logListeners: ((log: LogEntry) => void)[] = [];

export const addLog = (type: LogEntry['type'], message: string, details?: string) => {
  const log: LogEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toLocaleTimeString(),
    type,
    message,
    details,
  };
  logListeners.forEach(listener => listener(log));
};

export const ErrorConsole = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const listener = (log: LogEntry) => {
      setLogs(prev => [...prev, log]);
      setIsOpen(true);
    };
    logListeners.push(listener);
    return () => {
      logListeners = logListeners.filter(l => l !== listener);
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isOpen) {
    return logs.length > 0 ? (
      <Button
        onClick={() => setIsOpen(true)}
        variant="destructive"
        size="sm"
        className="fixed bottom-4 left-4 z-50"
      >
        <AlertCircle className="h-4 w-4 mr-2" />
        {logs.length} Error{logs.length !== 1 ? 's' : ''}
      </Button>
    ) : null;
  }

  return (
    <Card className="fixed bottom-4 left-4 z-50 w-[500px] max-h-[400px] shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          Console
        </CardTitle>
        <div className="flex gap-2">
          <Button onClick={clearLogs} variant="outline" size="sm">
            Clear
          </Button>
          <Button onClick={() => setIsOpen(false)} variant="ghost" size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full">
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs yet</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded-md text-xs font-mono border"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={
                        log.type === 'error'
                          ? 'destructive'
                          : log.type === 'warning'
                          ? 'secondary'
                          : 'default'
                      }
                    >
                      {log.type}
                    </Badge>
                    <span className="text-muted-foreground">{log.timestamp}</span>
                  </div>
                  <p className="text-foreground break-words">{log.message}</p>
                  {log.details && (
                    <pre className="mt-2 text-muted-foreground whitespace-pre-wrap break-words">
                      {log.details}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
