# Alternate Login Flow Implementation Guide

## Overview
This guide details how to implement alternate login flows for NexSpace, specifically handling email invitations and differentiating between self-signup and invited users.

## Current State Analysis

### Existing Infrastructure
1. **TeamContext.tsx** - Has invitation token generation and validation logic
2. **Onboarding Wizard** - Treats all users the same regardless of entry point
3. **Auth System** - Standard login/signup without invitation handling

### Missing Components
1. No dedicated invitation acceptance route
2. No pre-population of data from invitations
3. No differentiation in onboarding flow based on user source

## Implementation Plan

### 1. Email Invitation Flow

#### Backend Routes Needed
```typescript
// server/routes/invitation.ts
router.get('/api/invitations/:token', async (req, res) => {
  const invitation = await storage.getInvitationByToken(req.params.token);
  if (!invitation || invitation.expiresAt < new Date()) {
    return res.status(404).json({ error: 'Invalid or expired invitation' });
  }
  res.json(invitation);
});

router.post('/api/invitations/:token/accept', requireAuth, async (req, res) => {
  const invitation = await storage.acceptInvitation(req.params.token, req.user.id);
  res.json({ success: true, facilityId: invitation.facilityId });
});
```

#### Frontend Components

**InvitationAcceptancePage.tsx**
```tsx
function InvitationAcceptancePage() {
  const [token] = useRoute('/invite/:token');
  const { data: invitation, isLoading } = useQuery({
    queryKey: ['/api/invitations', token],
    enabled: !!token,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!invitation) return <InvalidInvitationMessage />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>You're Invited to Join {invitation.facilityName}</CardTitle>
        <CardDescription>
          {invitation.inviterName} has invited you to join as {invitation.role}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleAccept}>Accept Invitation</Button>
      </CardContent>
    </Card>
  );
}
```

### 2. Modified Onboarding Flow

#### Detection Logic
```tsx
// In OnboardingWizard.tsx
const urlParams = new URLSearchParams(window.location.search);
const invitationToken = urlParams.get('invitation');
const [invitationData, setInvitationData] = useState(null);

useEffect(() => {
  if (invitationToken) {
    fetchInvitation(invitationToken).then(setInvitationData);
  }
}, [invitationToken]);
```

#### Conditional Step Rendering
```tsx
// Skip facility step if user was invited
const steps = invitationData 
  ? [
      { id: 1, title: "Complete Your Profile", icon: User },
      { id: 2, title: "Invite Staff", icon: UserPlus },
      { id: 3, title: "Schedule First Shift", icon: Calendar },
    ]
  : [
      { id: 1, title: "Complete Your Profile", icon: User },
      { id: 2, title: "Set Up Facility/Team", icon: Building },
      { id: 3, title: "Invite Staff", icon: UserPlus },
      { id: 4, title: "Schedule First Shift", icon: Calendar },
    ];
```

### 3. Pre-population Strategy

#### From Invitation Data
```tsx
const [onboardingData, setOnboardingData] = useState<OnboardingData>({
  facilityId: invitationData?.facilityId,
  facilityName: invitationData?.facilityName,
  department: invitationData?.department,
  title: invitationData?.suggestedTitle,
});
```

#### Skip Facility Selection
```tsx
// In FacilityStep component
if (invitationData) {
  // Auto-advance to next step
  useEffect(() => {
    onNext({ 
      facilityId: invitationData.facilityId,
      facilityName: invitationData.facilityName 
    });
  }, []);
  
  return (
    <div className="text-center py-8">
      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
      <p>You'll be joining {invitationData.facilityName}</p>
    </div>
  );
}
```

### 4. Database Schema Updates

```sql
-- Add invitations table if not exists
CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  facility_id INTEGER REFERENCES facilities(id),
  role VARCHAR(100),
  invited_by INTEGER REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  accepted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add invitation_token to users for tracking
ALTER TABLE users ADD COLUMN invitation_token VARCHAR(255);
```

### 5. Email Template

```html
<!-- invitation-email.html -->
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>You're Invited to Join NexSpace</h2>
  <p>Hi {{recipientName}},</p>
  <p>{{inviterName}} has invited you to join {{facilityName}} as a {{role}}.</p>
  <p>Click the button below to accept this invitation and complete your profile:</p>
  <a href="{{acceptUrl}}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
    Accept Invitation
  </a>
  <p>This invitation expires on {{expiryDate}}.</p>
  <p>If you have any questions, please contact your administrator.</p>
</div>
```

### 6. User Flow Scenarios

#### Scenario A: Email Invitation
1. User receives email with invitation link
2. Clicks link → lands on `/invite/:token`
3. Views invitation details
4. Clicks "Accept" → redirected to signup/login
5. After auth → onboarding starts with pre-filled facility
6. Completes remaining steps (profile, optional invites, first shift)

#### Scenario B: Self Sign-up
1. User visits NexSpace directly
2. Signs up through regular flow
3. Sees full onboarding with all 4 steps
4. Must select or create facility
5. Completes all steps normally

#### Scenario C: Existing User Invited
1. User already has account
2. Receives invitation to join new facility
3. Clicks link → prompted to login
4. After login → sees "Join Facility" confirmation
5. Facility association created, no onboarding needed

### 7. Testing Checklist

#### Email Invitation Flow
- [ ] Invitation link works on mobile browsers
- [ ] Token validation handles expiry correctly
- [ ] Pre-population works for facility data
- [ ] Facility step is skipped appropriately
- [ ] User can still complete other steps

#### Responsive Testing
- [ ] Invitation acceptance page works on mobile
- [ ] Modified onboarding flow adapts to screen size
- [ ] Pre-filled data displays correctly
- [ ] Navigation between steps works smoothly

#### Edge Cases
- [ ] Expired invitation shows appropriate message
- [ ] Invalid token handled gracefully
- [ ] User already in facility shows error
- [ ] Network errors handled properly

## Implementation Priority

1. **Phase 1**: Database schema and backend routes
2. **Phase 2**: Invitation acceptance page
3. **Phase 3**: Modified onboarding flow
4. **Phase 4**: Email integration
5. **Phase 5**: Testing and refinement

## Security Considerations

- Invitation tokens should be cryptographically secure
- Tokens should expire after reasonable time (7 days)
- Rate limit invitation endpoints
- Validate facility associations on backend
- Log invitation acceptances for audit trail

## Conclusion
This implementation provides a seamless experience for both invited users and self-signups while maintaining security and data integrity. The responsive design ensures it works well across all devices.