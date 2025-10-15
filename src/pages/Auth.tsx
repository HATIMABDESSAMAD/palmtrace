import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Code2, Sprout } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleRoleSelection = async (role: 'admin' | 'viewer') => {
    setLoading(true);
    try {
      // Sign in anonymously
      const { data: authData, error: signInError } = await supabase.auth.signInAnonymously();

      if (signInError) throw signInError;

      if (!authData.user) {
        throw new Error('No user returned from sign in');
      }

      // Assign the selected role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ 
          user_id: authData.user.id, 
          role: role 
        });

      if (roleError) throw roleError;

      toast({
        title: 'Success',
        description: role === 'admin' 
          ? 'Signed in as Developer - Full access granted' 
          : 'Signed in as Farm Owner - Viewing mode enabled',
      });

      navigate('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to sign in',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img 
              src="/src/assets/palm-logo.svg" 
              alt="PalmTrace Logo" 
              className="h-16 w-16"
            />
          </div>
          <CardTitle className="text-3xl">Welcome to PalmTrace</CardTitle>
          <CardDescription className="text-base">
            Choose your access level to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleRoleSelection('admin')}
              disabled={loading}
              className="h-auto py-8 flex flex-col items-center gap-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              size="lg"
            >
              <Code2 className="h-12 w-12" />
              <div className="text-center">
                <div className="font-bold text-lg">Developer Access</div>
                <div className="text-sm font-normal opacity-90 mt-2">
                  View errors & console
                  <br />
                  Add & manage parcels
                  <br />
                  Upload Excel data
                </div>
              </div>
            </Button>

            <Button
              onClick={() => handleRoleSelection('viewer')}
              disabled={loading}
              className="h-auto py-8 flex flex-col items-center gap-4 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              size="lg"
            >
              <Sprout className="h-12 w-12" />
              <div className="text-center">
                <div className="font-bold text-lg">Farm Owner Access</div>
                <div className="text-sm font-normal opacity-90 mt-2">
                  View color-coded map
                  <br />
                  Look up tree data
                  <br />
                  Monitor farm status
                </div>
              </div>
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Select the access level that matches your role
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
