import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

export interface Team {
  id: string;
  name: string;
  description: string;
  facilities: number[];
  facilityNames: string[];
  members: TeamMember[];
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface TeamMember {
  userId: number;
  userName: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: string;
  permissions: {
    canInvite: boolean;
    canManageShifts: boolean;
    canViewReports: boolean;
    canManageMembers: boolean;
  };
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  invitedEmail: string;
  invitedBy: number;
  inviterName: string;
  role: TeamMember['role'];
  token: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
}

const sampleTeams: Team[] = [
  {
    id: 'team-icu-night',
    name: 'ICU Night Shift Team',
    description: 'Dedicated night shift team for intensive care unit',
    facilities: [1, 2],
    facilityNames: ['Portland General Hospital', 'Mercy Medical Center'],
    members: [
      {
        userId: 1,
        userName: 'Alice Smith',
        email: 'alice@nexspace.com',
        role: 'admin',
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        permissions: {
          canInvite: true,
          canManageShifts: true,
          canViewReports: true,
          canManageMembers: true
        }
      },
      {
        userId: 2,
        userName: 'Bob Johnson',
        email: 'bob@nexspace.com',
        role: 'member',
        joinedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        permissions: {
          canInvite: false,
          canManageShifts: true,
          canViewReports: true,
          canManageMembers: false
        }
      }
    ],
    createdBy: 1,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true
  }
];

const sampleInvitations: TeamInvitation[] = [
  {
    id: 'inv-1',
    teamId: 'team-icu-night',
    teamName: 'ICU Night Shift Team',
    invitedEmail: 'carol@nexspace.com',
    invitedBy: 1,
    inviterName: 'Alice Smith',
    role: 'member',
    token: 'inv-token-12345',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

interface TeamContextType {
  teams: Team[];
  invitations: TeamInvitation[];
  userTeams: Team[];
  createTeam: (name: string, description: string, facilities: number[]) => string;
  inviteToTeam: (teamId: string, email: string, role: TeamMember['role']) => void;
  acceptInvitation: (token: string) => boolean;
  declineInvitation: (token: string) => void;
  updateMemberRole: (teamId: string, userId: number, role: TeamMember['role']) => void;
  removeMember: (teamId: string, userId: number) => void;
  getTeamById: (teamId: string) => Team | undefined;
  getUserPermissions: (teamId: string, userId: number) => TeamMember['permissions'] | null;
  isLoading: boolean;
}

const TeamContext = createContext<TeamContextType | null>(null);

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>(sampleTeams);
  const [invitations, setInvitations] = useState<TeamInvitation[]>(sampleInvitations);
  const [isLoading, setIsLoading] = useState(false);

  const userTeams = teams.filter(team => 
    team.members.some(member => member.userId === user?.id)
  );

  const createTeam = (name: string, description: string, facilities: number[]): string => {
    if (!user) return '';

    const newTeamId = `team-${Date.now()}`;
    const newTeam: Team = {
      id: newTeamId,
      name,
      description,
      facilities,
      facilityNames: [], // Would be populated from facility data in real implementation
      members: [{
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: 'admin',
        joinedAt: new Date().toISOString(),
        permissions: {
          canInvite: true,
          canManageShifts: true,
          canViewReports: true,
          canManageMembers: true
        }
      }],
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    };

    setTeams(prev => [newTeam, ...prev]);
    return newTeamId;
  };

  const inviteToTeam = (teamId: string, email: string, role: TeamMember['role']) => {
    if (!user) return;

    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const newInvitation: TeamInvitation = {
      id: `inv-${Date.now()}`,
      teamId,
      teamName: team.name,
      invitedEmail: email,
      invitedBy: user.id,
      inviterName: `${user.firstName} ${user.lastName}`,
      role,
      token: `inv-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setInvitations(prev => [newInvitation, ...prev]);
  };

  const acceptInvitation = (token: string): boolean => {
    if (!user) return false;

    const invitation = invitations.find(inv => inv.token === token && inv.status === 'pending');
    if (!invitation || new Date(invitation.expiresAt) < new Date()) {
      return false;
    }

    // Add user to team
    setTeams(prev => prev.map(team => 
      team.id === invitation.teamId 
        ? {
            ...team,
            members: [...team.members, {
              userId: user.id,
              userName: `${user.firstName} ${user.lastName}`,
              email: user.email,
              role: invitation.role,
              joinedAt: new Date().toISOString(),
              permissions: {
                canInvite: invitation.role === 'admin',
                canManageShifts: invitation.role !== 'viewer',
                canViewReports: true,
                canManageMembers: invitation.role === 'admin'
              }
            }]
          }
        : team
    ));

    // Mark invitation as accepted
    setInvitations(prev => prev.map(inv =>
      inv.token === token ? { ...inv, status: 'accepted' as const } : inv
    ));

    return true;
  };

  const declineInvitation = (token: string) => {
    setInvitations(prev => prev.map(inv =>
      inv.token === token ? { ...inv, status: 'declined' as const } : inv
    ));
  };

  const updateMemberRole = (teamId: string, userId: number, role: TeamMember['role']) => {
    setTeams(prev => prev.map(team =>
      team.id === teamId
        ? {
            ...team,
            members: team.members.map(member =>
              member.userId === userId
                ? {
                    ...member,
                    role,
                    permissions: {
                      canInvite: role === 'admin',
                      canManageShifts: role !== 'viewer',
                      canViewReports: true,
                      canManageMembers: role === 'admin'
                    }
                  }
                : member
            )
          }
        : team
    ));
  };

  const removeMember = (teamId: string, userId: number) => {
    setTeams(prev => prev.map(team =>
      team.id === teamId
        ? { ...team, members: team.members.filter(member => member.userId !== userId) }
        : team
    ));
  };

  const getTeamById = (teamId: string): Team | undefined => {
    return teams.find(team => team.id === teamId);
  };

  const getUserPermissions = (teamId: string, userId: number): TeamMember['permissions'] | null => {
    const team = teams.find(t => t.id === teamId);
    const member = team?.members.find(m => m.userId === userId);
    return member?.permissions || null;
  };

  const value: TeamContextType = {
    teams,
    invitations,
    userTeams,
    createTeam,
    inviteToTeam,
    acceptInvitation,
    declineInvitation,
    updateMemberRole,
    removeMember,
    getTeamById,
    getUserPermissions,
    isLoading
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeams = (): TeamContextType => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeams must be used within a TeamProvider');
  }
  return context;
};