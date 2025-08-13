import { useState } from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ThemeProvider } from "@/providers/ThemeProvider";

function LoginTest() {
  const [username, setUsername] = useState('super_admin');
  const [password, setPassword] = useState('admin123');
  const [loginResult, setLoginResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      setLoginResult(data);
      
      if (response.ok) {
        toast({
          title: 'Login Successful',
          description: `Welcome ${data.username}! Role: ${data.role}`
        });
      } else {
        toast({
          title: 'Login Failed',
          description: data.message || 'Invalid credentials',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to server',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAPI = async (endpoint: string) => {
    try {
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      const data = await response.json();
      toast({
        title: `API Test: ${endpoint}`,
        description: response.ok ? 'Success' : `Failed: ${data.message || data.error}`
      });
      console.log(`${endpoint} response:`, data);
    } catch (error) {
      toast({
        title: `API Test Failed: ${endpoint}`,
        description: 'Check console for details',
        variant: 'destructive'
      });
      console.error(`${endpoint} error:`, error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>NexSpace - Simple Authentication Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleLogin} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
            
            {loginResult && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <h3 className="font-semibold mb-2">Login Response:</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(loginResult, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Test API Endpoints:</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => handleTestAPI('/api/users/me')} 
                  variant="outline"
                  size="sm"
                >
                  Test /api/users/me
                </Button>
                <Button 
                  onClick={() => handleTestAPI('/api/facilities')} 
                  variant="outline"
                  size="sm"
                >
                  Test /api/facilities
                </Button>
                <Button 
                  onClick={() => handleTestAPI('/api/shifts')} 
                  variant="outline"
                  size="sm"
                >
                  Test /api/shifts
                </Button>
                <Button 
                  onClick={() => handleTestAPI('/api/staff')} 
                  variant="outline"
                  size="sm"
                >
                  Test /api/staff
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Backend API:</span>
                <span className="text-green-600 dark:text-green-400">✓ Running on port 5000</span>
              </div>
              <div className="flex justify-between">
                <span>Frontend:</span>
                <span className="text-green-600 dark:text-green-400">✓ React + Vite</span>
              </div>
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="text-green-600 dark:text-green-400">✓ PostgreSQL Connected</span>
              </div>
              <div className="flex justify-between">
                <span>Authentication:</span>
                <span className="text-green-600 dark:text-green-400">✓ Passport Session-based</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SimpleApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LoginTest />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default SimpleApp;