import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useStaff } from "@/contexts/StaffContext";
import { useCredentialVerification } from "@/contexts/CredentialVerificationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Award, 
  CheckCircle, 
  AlertTriangle,
  Edit,
  Save,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function EnhancedProfilePage() {
  const { user } = useAuth();
  const { getStaffById, updateStaffMember } = useStaff();
  const { getVerifiedCredentials } = useCredentialVerification();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: ''
  });

  const staffMember = user ? getStaffById(user.id.toString()) : null;
  const verifiedCredentials = user ? getVerifiedCredentials(user.id.toString()) : [];

  useEffect(() => {
    if (staffMember) {
      setEditedProfile({
        email: staffMember.email,
        phone: staffMember.phone || '',
        firstName: staffMember.firstName,
        lastName: staffMember.lastName
      });
    }
  }, [staffMember]);

  const handleSaveProfile = async () => {
    if (!staffMember) return;

    try {
      await updateStaffMember(staffMember.id, editedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleCancelEdit = () => {
    if (staffMember) {
      setEditedProfile({
        email: staffMember.email,
        phone: staffMember.phone || '',
        firstName: staffMember.firstName,
        lastName: staffMember.lastName
      });
    }
    setIsEditing(false);
  };

  const getCredentialStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'expired':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!user || !staffMember) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">Unable to load profile information</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your personal information and credentials</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSaveProfile} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button onClick={handleCancelEdit} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your basic contact and personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={staffMember.avatar} />
                  <AvatarFallback className="text-lg">
                    {staffMember.firstName.charAt(0)}{staffMember.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {staffMember.firstName} {staffMember.lastName}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{staffMember.role.charAt(0).toUpperCase() + staffMember.role.slice(1)}</p>
                  <p className="text-sm text-gray-500">{staffMember.department}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={editedProfile.firstName}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{staffMember.firstName}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={editedProfile.lastName}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{staffMember.lastName}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editedProfile.email}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, email: e.target.value }))}
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{staffMember.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{staffMember.phone || 'Not provided'}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Professional Credentials
              </CardTitle>
              <CardDescription>
                Your verified licenses and certifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {verifiedCredentials.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No verified credentials found</p>
                  <p className="text-sm text-gray-400">Contact your administrator to verify your credentials</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verifiedCredentials.map((credential) => (
                    <div key={credential.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{credential.credentialType}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            License #: {credential.licenseNumber}
                          </p>
                        </div>
                        {getCredentialStatusBadge(credential.verificationStatus)}
                      </div>
                      
                      <div className="grid gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{credential.issuingAuthority}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Issued: {formatDate(credential.issueDate)} | 
                            Expires: {formatDate(credential.expirationDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            Verified by {credential.verifiedBy} on {formatDate(credential.verifiedDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Employment Information
              </CardTitle>
              <CardDescription>
                Your current role and department details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Employee ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono">{staffMember.id.toString().padStart(4, '0')}</span>
                  </div>
                </div>

                <div>
                  <Label>Employment Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">
                      {staffMember.role.charAt(0).toUpperCase() + staffMember.role.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label>Department</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span>{staffMember.department}</span>
                  </div>
                </div>

                <div>
                  <Label>Specialty</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-blue-100 text-blue-800">
                      {staffMember.specialty}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label>Compliance Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {staffMember.compliant ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Compliant
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Non-Compliant
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Active Credentials</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-semibold text-green-600">
                      {staffMember.activeCredentials}
                    </span>
                    {staffMember.expiringCredentials > 0 && (
                      <Badge variant="outline" className="text-yellow-600">
                        {staffMember.expiringCredentials} expiring soon
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}