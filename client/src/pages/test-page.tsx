import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function TestPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginResult, setLoginResult] = useState<any>(null);
  const [meResult, setMeResult] = useState<any>(null);
  const { toast } = useToast();

  const handleLogin = async () => {
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
          description: `Welcome ${data.username}!`
        });
        
        // Test /api/users/me endpoint
        const meResponse = await fetch('/api/users/me', {
          credentials: 'include'
        });
        const meData = await meResponse.json();
        setMeResult(meData);
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
        title: 'Error',
        description: 'Failed to connect to server',
        variant: 'destructive'
      });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setLoginResult(null);
      setMeResult(null);
      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Test Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="super_admin"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleLogin}>Test Login</Button>
              <Button onClick={handleLogout} variant="outline">Test Logout</Button>
            </div>
            
            {loginResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Login Response:</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(loginResult, null, 2)}
                </pre>
              </div>
            )}
            
            {meResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">/api/users/me Response:</h3>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(meResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Design System Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-primary text-primary-foreground rounded">Primary</div>
              <div className="p-4 bg-secondary text-secondary-foreground rounded">Secondary</div>
              <div className="p-4 bg-muted text-muted-foreground rounded">Muted</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}