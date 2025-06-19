import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Users, Calendar, Shield, BarChart } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Logo } from "@/components/ui/logo";
import { UserRole } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AuthPage() {
  const { user, loginMutation, registerMutation, forgotPasswordMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [forgotPasswordUsername, setForgotPasswordUsername] = useState("");
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: UserRole.INTERNAL_EMPLOYEE,
    facilityId: 1
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerData);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPasswordMutation.mutate({ username: forgotPasswordUsername });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Column - Authentication Forms */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Logo size="lg" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome to NexSpace</h2>
            <p className="mt-2 text-sm text-gray-600">
              Healthcare staffing platform connecting facilities with qualified professionals
            </p>
          </div>

          {/* Auth Forms */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Sign Up</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        value={loginData.username}
                        onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                    
                    {loginMutation.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {loginMutation.error.message}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing In..." : "Sign In"}
                    </Button>

                    <div className="text-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="link" className="text-sm text-blue-600 hover:text-blue-800">
                            Forgot your password?
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogDescription>
                              Enter your username to receive a temporary password
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="forgot-username">Username</Label>
                              <Input
                                id="forgot-username"
                                type="text"
                                value={forgotPasswordUsername}
                                onChange={(e) => setForgotPasswordUsername(e.target.value)}
                                required
                              />
                            </div>
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={forgotPasswordMutation.isPending}
                            >
                              {forgotPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Join the NexSpace healthcare staffing platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={registerData.firstName}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, firstName: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, lastName: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registerUsername">Username</Label>
                      <Input
                        id="registerUsername"
                        value={registerData.username}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registerPassword">Password</Label>
                      <Input
                        id="registerPassword"
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select 
                        value={registerData.role} 
                        onValueChange={(value) => setRegisterData(prev => ({ ...prev, role: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UserRole.INTERNAL_EMPLOYEE}>Internal Employee</SelectItem>
                          <SelectItem value={UserRole.CONTRACTOR_1099}>1099 Contractor</SelectItem>
                          <SelectItem value={UserRole.FACILITY_MANAGER}>Facility Manager</SelectItem>
                          <SelectItem value={UserRole.CLIENT_ADMINISTRATOR}>Client Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {registerMutation.error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {registerMutation.error.message}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Column - Hero Section */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col justify-center px-12 py-16">
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Transform Healthcare Staffing
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Connect qualified healthcare professionals with facilities in need. 
              Streamline scheduling, ensure compliance, and deliver exceptional patient care.
            </p>

            {/* Feature highlights */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Smart Scheduling</h3>
                  <p className="text-gray-600">Advanced scheduling with real-time availability and automated shift assignments.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Compliance Management</h3>
                  <p className="text-gray-600">Track credentials, certifications, and ensure regulatory compliance effortlessly.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Staff Management</h3>
                  <p className="text-gray-600">Comprehensive tools for managing employees, contractors, and facility staff.</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <BarChart className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Analytics & Insights</h3>
                  <p className="text-gray-600">Data-driven insights for optimal staffing decisions and operational efficiency.</p>
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center space-x-2 text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>HIPAA Compliant • SOC 2 Certified • 99.9% Uptime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
