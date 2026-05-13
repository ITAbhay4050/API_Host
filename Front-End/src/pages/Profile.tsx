import { useState, useEffect, ChangeEvent } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { UserRole } from "@/types";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "gu", label: "Gujarati" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC – Coordinated Universal Time" },
  { value: "Asia/Kolkata", label: "IST – Asia/Kolkata" },
  { value: "Asia/Dubai", label: "GST – Asia/Dubai" },
  { value: "Europe/London", label: "GMT – Europe/London" },
  { value: "America/New_York", label: "EST – America/New_York" },
];

const MAX_PHOTO_MB = 5;

const Profile = () => {
  const { user /*, refreshUser */ } = useAuth();
  const { toast } = useToast();

  /* ------------------------------------------------------------------ */
  /*  Profile & Photo                                                   */
  /* ------------------------------------------------------------------ */
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    bio: "",
  });

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  /* ------------------------------------------------------------------ */
  /*  Settings (persisted)                                              */
  /* ------------------------------------------------------------------ */
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    taskReminders: true,
    weeklyReports: false,
    darkMode: false,
    language: "en",
    timezone: "UTC",
  });

  /* ------------------------------------------------------------------ */
  /*  Load persisted state on mount                                     */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const savedSettings = localStorage.getItem("userSettings");
    const savedPhoto = localStorage.getItem("profilePhoto");

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        if (parsed.darkMode) {
          document.documentElement.classList.add("dark");
        }
      } catch (e) {
        console.error("Failed to parse saved settings", e);
      }
    }
    if (savedPhoto) setProfilePhoto(savedPhoto);
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Persist settings + dark-mode toggle                               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    localStorage.setItem("userSettings", JSON.stringify(settings));
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings]);

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */
  const roleName = (() => {
    switch (user?.role) {
      case UserRole.APPLICATION_ADMIN:
        return "System Administrator";
      case UserRole.COMPANY_ADMIN:
        return "Company Administrator";
      case UserRole.COMPANY_EMPLOYEE:
        return "Company Employee";
      case UserRole.DEALER_ADMIN:
        return "Dealer Administrator";
      case UserRole.DEALER_EMPLOYEE:
        return "Dealer Employee";
      default:
        return "User";
    }
  })();

  const roleBadge = (() => {
    switch (user?.role) {
      case UserRole.APPLICATION_ADMIN:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case UserRole.COMPANY_ADMIN:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case UserRole.COMPANY_EMPLOYEE:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case UserRole.DEALER_ADMIN:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case UserRole.DEALER_EMPLOYEE:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  })();

  /* ------------------------------------------------------------------ */
  /*  Photo upload / remove                                             */
  /* ------------------------------------------------------------------ */
  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: `Please pick an image under ${MAX_PHOTO_MB} MB`,
      });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Only image files are allowed.",
      });
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (evt) =>
      setProfilePhoto(evt.target?.result as string | null);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    setPhotoFile(null);
    localStorage.removeItem("profilePhoto");
  };

  /* ------------------------------------------------------------------ */
  /*  Save handlers (stubbed API calls)                                 */
  /* ------------------------------------------------------------------ */
  const handleProfileSave = async () => {
    if (photoFile) {
      localStorage.setItem("profilePhoto", profilePhoto || "");
    }
    // await api.put("/me/profile", profileData);
    toast({ title: "Profile Updated" });
    // await refreshUser?.();
  };

  const handleSettingsSave = async () => {
    // already persisted via useEffect
    toast({ title: "Settings Saved", description: "Changes will stick next visit." });
  };

  /* ------------------------------------------------------------------ */
  /*  JSX                                                               */
  /* ------------------------------------------------------------------ */
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header>
          <h2 className="text-3xl font-bold tracking-tight">Profile &amp; Settings</h2>
          <p className="text-muted-foreground">
            Manage your account details and preferences
          </p>
        </header>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile Details</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* ------------------------- PROFILE TAB ------------------------- */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar + basic info */}
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      {profilePhoto ? (
                        <AvatarImage src={profilePhoto} alt="Profile" />
                      ) : (
                        <AvatarFallback className="text-lg">
                          {user?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {profilePhoto && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                        onClick={handleRemovePhoto}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold">{user?.name}</h3>
                    <Badge className={roleBadge}>{roleName}</Badge>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <div className="flex items-center gap-2">
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => document.getElementById("photo-upload")?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Editable fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { id: "name", label: "Full Name" },
                    { id: "email", label: "Email Address", type: "email" },
                    { id: "phone", label: "Phone Number" },
                    { id: "address", label: "Address" },
                  ].map(({ id, label, type = "text" }) => (
                    <div key={id} className="space-y-2">
                      <Label htmlFor={id}>{label}</Label>
                      <Input
                        id={id}
                        type={type}
                        value={profileData[id as keyof typeof profileData]}
                        onChange={(e) =>
                          setProfileData((p) => ({
                            ...p,
                            [id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    placeholder="Tell us about yourself..."
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData((p) => ({ ...p, bio: e.target.value }))
                    }
                  />
                </div>

                <Button onClick={handleProfileSave}>Save Profile</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------- SETTINGS TAB ------------------------- */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  {
                    id: "emailNotifications",
                    label: "Email Notifications",
                    desc: "Receive notifications via email",
                  },
                  {
                    id: "pushNotifications",
                    label: "Push Notifications",
                    desc: "Receive push notifications in browser",
                  },
                  {
                    id: "taskReminders",
                    label: "Task Reminders",
                    desc: "Get reminded about upcoming task deadlines",
                  },
                  {
                    id: "weeklyReports",
                    label: "Weekly Reports",
                    desc: "Receive weekly summary reports",
                  },
                ].map(({ id, label, desc }) => (
                  <div key={id} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{label}</Label>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={settings[id as keyof typeof settings] as boolean}
                      onCheckedChange={(ck) =>
                        setSettings((s) => ({ ...s, [id]: ck }))
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Application Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dark-mode */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Use dark theme (persists across sessions)
                    </p>
                  </div>
                  <Switch
                    checked={settings.darkMode}
                    onCheckedChange={(ck) =>
                      setSettings((s) => ({ ...s, darkMode: ck }))
                    }
                  />
                </div>

                {/* Language / TZ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={settings.language}
                      onValueChange={(val) =>
                        setSettings((s) => ({ ...s, language: val }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={settings.timezone}
                      onValueChange={(val) =>
                        setSettings((s) => ({ ...s, timezone: val }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleSettingsSave}>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
