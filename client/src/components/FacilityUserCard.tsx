import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, Mail, Phone, MapPin, Building2, Calendar } from 'lucide-react';

interface FacilityUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  specialty?: string;
  associatedFacilities: number[];
  avatar?: string;
  facilityId?: number;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface FacilityUserCardProps {
  user: FacilityUser;
  onEdit: (user: FacilityUser) => void;
}

export function FacilityUserCard({ user, onEdit }: FacilityUserCardProps) {
  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      'facility_administrator': 'bg-purple-100 text-purple-800',
      'scheduling_coordinator': 'bg-blue-100 text-blue-800',
      'hr_manager': 'bg-green-100 text-green-800',
      'billing': 'bg-yellow-100 text-yellow-800',
      'supervisor': 'bg-orange-100 text-orange-800',
      'director_of_nursing': 'bg-red-100 text-red-800',
      'viewer': 'bg-gray-100 text-gray-800',
      'corporate': 'bg-indigo-100 text-indigo-800',
      'regional_director': 'bg-pink-100 text-pink-800'
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800';
  };

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>
                {user.firstName[0]}{user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {user.firstName} {user.lastName}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {formatRole(user.role)}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={user.isActive ? "default" : "secondary"}
            className={user.isActive ? "bg-green-100 text-green-800" : ""}
          >
            {user.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-600">
            <Mail className="h-4 w-4 mr-2 text-gray-400" />
            {user.email}
          </div>
          
          {user.phone && (
            <div className="flex items-center text-gray-600">
              <Phone className="h-4 w-4 mr-2 text-gray-400" />
              {user.phone}
            </div>
          )}
          
          <div className="flex items-center text-gray-600">
            <Building2 className="h-4 w-4 mr-2 text-gray-400" />
            {user.associatedFacilities.length} facilities
          </div>

          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            Joined {new Date(user.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Badge className={getRoleColor(user.role)}>
            {formatRole(user.role)}
          </Badge>
          {user.specialty && (
            <Badge variant="outline">
              {user.specialty}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onEdit(user)}
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}