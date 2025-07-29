import Layout from "@/components/Layout";
import { ProfileEditor } from "@/components/ProfileEditor";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            My Profile
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your personal information and preferences
          </p>
        </div>

        {user && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Email</div>
                <div className="font-medium">{user.email}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Username</div>
                <div className="font-medium">@{user.username}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Role</div>
                <div className="font-medium capitalize">{user.role?.replace("_", " ")}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <ProfileEditor />
      </div>
    </Layout>
  );
}