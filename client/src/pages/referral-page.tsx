import { useState } from "react";
import { UserPlus, Gift, DollarSign, Users, Trophy, Share, Mail, Copy, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { useToast } from "@/hooks/use-toast";

const mockReferrals = [
  {
    id: 1,
    referredName: "Jessica Martinez",
    email: "jessica.m@email.com",
    position: "Registered Nurse",
    status: "hired",
    referralDate: "2025-05-15",
    hireDate: "2025-06-01",
    bonusAmount: 1500,
    bonusStatus: "paid"
  },
  {
    id: 2,
    referredName: "Marcus Thompson",
    email: "marcus.t@email.com",
    position: "Licensed Practical Nurse",
    status: "interviewing",
    referralDate: "2025-06-10",
    hireDate: null,
    bonusAmount: 1000,
    bonusStatus: "pending"
  },
  {
    id: 3,
    referredName: "Ana Rodriguez",
    email: "ana.r@email.com",
    position: "Certified Nursing Assistant",
    status: "applied",
    referralDate: "2025-06-14",
    hireDate: null,
    bonusAmount: 750,
    bonusStatus: "pending"
  }
];

export default function ReferralPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralForm, setReferralForm] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    message: ""
  });
  const [copied, setCopied] = useState(false);

  const referralCode = `REF-${user?.firstName?.toUpperCase()}${user?.id}`;
  const referralLink = `https://nexspace.app/join?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Referral link copied!",
      description: "Share this link with qualified healthcare professionals."
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitReferral = () => {
    toast({
      title: "Referral submitted!",
      description: `We'll reach out to ${referralForm.name} within 24 hours.`
    });
    setReferralForm({ name: "", email: "", phone: "", position: "", message: "" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hired": return "bg-green-100 text-green-800";
      case "interviewing": return "bg-blue-100 text-blue-800";
      case "applied": return "bg-yellow-100 text-yellow-800";
      case "declined": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const totalEarned = mockReferrals
    .filter(r => r.bonusStatus === "paid")
    .reduce((sum, r) => sum + r.bonusAmount, 0);

  const pendingEarnings = mockReferrals
    .filter(r => r.bonusStatus === "pending")
    .reduce((sum, r) => sum + r.bonusAmount, 0);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNav user={user!} />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referral System</h1>
              <p className="text-gray-600 dark:text-gray-300">Refer qualified healthcare professionals and earn rewards</p>
            </div>
            <Button>
              <Share className="w-4 h-4 mr-2" />
              Share Program
            </Button>
          </div>

          {/* Referral Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Referrals</p>
                    <p className="text-2xl font-bold">{mockReferrals.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Successful Hires</p>
                    <p className="text-2xl font-bold text-green-600">
                      {mockReferrals.filter(r => r.status === 'hired').length}
                    </p>
                  </div>
                  <Trophy className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Earnings Paid</p>
                    <p className="text-2xl font-bold text-green-600">${totalEarned.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending Earnings</p>
                    <p className="text-2xl font-bold text-yellow-600">${pendingEarnings.toLocaleString()}</p>
                  </div>
                  <Gift className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Referral Link */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share className="w-5 h-5" />
                  Your Referral Link
                </CardTitle>
                <CardDescription>
                  Share this link with healthcare professionals you'd like to refer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Referral Code: {referralCode}</p>
                  <div className="flex gap-2">
                    <Input value={referralLink} readOnly className="flex-1" />
                    <Button onClick={handleCopyLink} variant="outline">
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Referral Bonuses</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Registered Nurse: $1,500</li>
                    <li>• Licensed Practical Nurse: $1,000</li>
                    <li>• Certified Nursing Assistant: $750</li>
                    <li>• Physical Therapist: $2,000</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Direct Referral Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Direct Referral
                </CardTitle>
                <CardDescription>
                  Directly refer someone by providing their information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Full Name"
                    value={referralForm.name}
                    onChange={(e) => setReferralForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={referralForm.email}
                    onChange={(e) => setReferralForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Phone Number"
                    value={referralForm.phone}
                    onChange={(e) => setReferralForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                  <Input
                    placeholder="Position/Specialty"
                    value={referralForm.position}
                    onChange={(e) => setReferralForm(prev => ({ ...prev, position: e.target.value }))}
                  />
                </div>
                <Textarea
                  placeholder="Why would they be a great fit? (optional)"
                  value={referralForm.message}
                  onChange={(e) => setReferralForm(prev => ({ ...prev, message: e.target.value }))}
                  className="h-20"
                />
                <Button onClick={handleSubmitReferral} className="w-full">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Submit Referral
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Referral History */}
          <Card>
            <CardHeader>
              <CardTitle>Your Referrals</CardTitle>
              <CardDescription>
                Track the status of your referred candidates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockReferrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {referral.referredName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h4 className="font-medium">{referral.referredName}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{referral.email}</p>
                        <p className="text-sm text-gray-500">{referral.position}</p>
                      </div>
                    </div>

                    <div className="text-center">
                      <Badge className={getStatusColor(referral.status)}>
                        {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Referred: {new Date(referral.referralDate).toLocaleDateString()}
                      </p>
                      {referral.hireDate && (
                        <p className="text-xs text-green-600">
                          Hired: {new Date(referral.hireDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        ${referral.bonusAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {referral.bonusStatus === 'paid' ? 'Paid' : 'Pending'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {mockReferrals.length === 0 && (
                <div className="text-center py-8">
                  <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No referrals yet
                  </h3>
                  <p className="text-gray-500">
                    Start referring qualified healthcare professionals to earn rewards
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}