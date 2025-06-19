import { useState } from "react";
import {
  UserPlus,
  Gift,
  DollarSign,
  Users,
  Trophy,
  Share,
  Mail,
  Copy,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

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
    bonusStatus: "paid",
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
    bonusStatus: "pending",
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
    bonusStatus: "pending",
  },
];

export default function ReferralPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralForm, setReferralForm] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    message: "",
  });
  const [copied, setCopied] = useState(false);

  const referralCode = `REF-${user?.firstName?.toUpperCase()}${user?.id}`;
  const referralLink = `https://nexspace.app/join?ref=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Referral link copied!",
      description: "Share this link with qualified healthcare professionals.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const totalEarned = mockReferrals
    .filter((r) => r.bonusStatus === "paid")
    .reduce((sum, r) => sum + r.bonusAmount, 0);

  const pendingEarnings = mockReferrals
    .filter((r) => r.bonusStatus === "pending")
    .reduce((sum, r) => sum + r.bonusAmount, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-end mb-6">
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Referrals
                </p>
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Successful Hires
                </p>
                <p className="text-2xl font-bold">
                  {mockReferrals.filter((r) => r.status === "hired").length}
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Earned</p>
                <p className="text-2xl font-bold">${totalEarned.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Pending Earnings
                </p>
                <p className="text-2xl font-bold">${pendingEarnings.toLocaleString()}</p>
              </div>
              <Gift className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
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
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Referral Bonuses
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Registered Nurse: $1,500</li>
                <li>• Licensed Practical Nurse: $1,000</li>
                <li>• Certified Nursing Assistant: $750</li>
                <li>• Physical Therapist: $1,200</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Quick Referral Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Quick Referral
            </CardTitle>
            <CardDescription>Refer someone directly through our platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={referralForm.name}
                  onChange={(e) => setReferralForm({ ...referralForm, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  value={referralForm.email}
                  onChange={(e) => setReferralForm({ ...referralForm, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  value={referralForm.phone}
                  onChange={(e) => setReferralForm({ ...referralForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Position</label>
                <Input
                  value={referralForm.position}
                  onChange={(e) => setReferralForm({ ...referralForm, position: e.target.value })}
                  placeholder="e.g., Registered Nurse"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Additional Message</label>
                <Textarea
                  value={referralForm.message}
                  onChange={(e) => setReferralForm({ ...referralForm, message: e.target.value })}
                  placeholder="Optional message about the referral"
                  rows={3}
                />
              </div>
              <Button className="w-full">
                <Mail className="w-4 h-4 mr-2" />
                Send Referral
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
          <CardDescription>Track the status of your referrals and earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {mockReferrals.map((referral) => (
            <div
              key={referral.id}
              className="flex items-center justify-between p-4 border rounded-lg mb-4 last:mb-0"
            >
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>
                    {referral.referredName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{referral.referredName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{referral.position}</p>
                  <p className="text-sm text-gray-500">Referred: {referral.referralDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge
                  variant={
                    referral.status === "hired"
                      ? "default"
                      : referral.status === "interviewing"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {referral.status}
                </Badge>
                <div className="text-right">
                  <p className="font-medium">${referral.bonusAmount.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">
                    {referral.bonusStatus === "paid" ? "✓ Paid" : "Pending"}
                  </p>
                </div>
              </div>
            </div>
          ))}

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
  );
}
