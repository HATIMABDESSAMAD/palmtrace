import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleMap from '@/components/GoogleMap';
import Header from '@/components/Header';
import { ExcelUploader } from '@/components/ExcelUploader';
import { ExcelHistory } from '@/components/ExcelHistory';
import { ErrorConsole } from '@/components/ErrorConsole';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { role, loading: roleLoading, isAdmin } = useUserRole(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <Header />
      
      {/* User info and logout button */}
      <div className="absolute top-20 right-4 z-20 flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 px-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm">
            <div className="font-medium">{user.email}</div>
            <div className="text-xs text-muted-foreground capitalize">{role}</div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <div className="pt-[72px] h-full">
        <GoogleMap />
        
        {/* Admin tools - only visible for admins */}
        {isAdmin && (
          <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-4">
            <ExcelUploader />
            <ExcelHistory />
          </div>
        )}
        
        {/* Error console - only visible for admins */}
        {isAdmin && <ErrorConsole />}
        
        {/* Viewer message */}
        {!isAdmin && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
            <p className="text-sm text-muted-foreground text-center">
              You are viewing in read-only mode. Contact an administrator for edit access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
