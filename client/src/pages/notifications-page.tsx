import React from "react";
import { useNotifications, NotificationType } from "@/contexts/NotificationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Settings, Check, Mail, Phone, Smartphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const { notifications, prefs, unreadCount, markRead, markAllRead, updatePref } =
    useNotifications();

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "shift_request":
        return "📅";
      case "assignment_change":
        return "🔄";
      case "message":
        return "💬";
      case "credential_update":
        return "📋";
      case "favorite_shift":
        return "⭐";
      case "social_post":
        return "📣";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case "shift_request":
        return "bg-blue-100 text-blue-800";
      case "assignment_change":
        return "bg-orange-100 text-orange-800";
      case "message":
        return "bg-green-100 text-green-800";
      case "credential_update":
        return "bg-red-100 text-red-800";
      case "favorite_shift":
        return "bg-purple-100 text-purple-800";
      case "social_post":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatNotificationType = (type: NotificationType) => {
    return type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Notification Center
          </h1>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount} unread</Badge>}
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllRead} variant="outline" size="sm">
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notification Preferences */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(prefs).map(([type, conf]) => (
              <div key={type} className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                  {formatNotificationType(type as NotificationType)}
                </h4>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-600">Email</span>
                    </div>
                    <Switch
                      checked={conf.email}
                      onCheckedChange={(checked) =>
                        updatePref(type as NotificationType, { email: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-600">SMS</span>
                    </div>
                    <Switch
                      checked={conf.sms}
                      onCheckedChange={(checked) =>
                        updatePref(type as NotificationType, { sms: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-600">Push</span>
                    </div>
                    <Switch
                      checked={conf.push}
                      onCheckedChange={(checked) =>
                        updatePref(type as NotificationType, { push: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      !notification.read
                        ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                        : "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-xl">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="secondary"
                              className={getNotificationColor(notification.type)}
                            >
                              {formatNotificationType(notification.type)}
                            </Badge>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.timestamp), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markRead(notification.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
