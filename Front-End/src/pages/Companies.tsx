import { useEffect, useState } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Users,
  MapPin,
  Phone,
  Mail,
  UserPlus,
  CheckCircle,
  X,
} from "lucide-react";
import { UserRole, UserStatus } from "@/types";

// -----------------------------------------------------------------------------
// Types & Mock Data
// -----------------------------------------------------------------------------

type EnhancedCompany = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  gstNumber: string;
  panNumber: string;
  status: UserStatus;
};

type AdminUserDraft = {
  name: string;
  email: string;
  password: string;
};

const mockCompanies: EnhancedCompany[] = [
  {
    id: "1",
    name: "TechCorp Industries",
    address: "123 Business Ave",
    city: "Tech City",
    state: "TC",
    country: "India",
    pinCode: "12345",
    contactPerson: "John Smith",
    contactEmail: "john.smith@techcorp.com",
    contactPhone: "+1 (555) 123-4567",
    gstNumber: "29ABCDE1234F1Z5",
    panNumber: "ABCDE1234F",
    status: UserStatus.ACTIVE,
  },
  {
    id: "2",
    name: "Manufacturing Solutions Ltd",
    address: "456 Industrial Blvd",
    city: "Factory Town",
    state: "FT",
    country: "India",
    pinCode: "67890",
    contactPerson: "Sarah Johnson",
    contactEmail: "sarah.johnson@mansol.com",
    contactPhone: "+1 (555) 987-6543",
    gstNumber: "29FGHIJ5678K2L6",
    panNumber: "FGHIJ5678K",
    status: UserStatus.ACTIVE,
  },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function CompaniesPage() {
  const { user } = useAuth();

  // Company state ------------------------------------------------------------
  const [companies, setCompanies] = useState<EnhancedCompany[]>(mockCompanies);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog state -------------------------------------------------------------
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const [isAdminUserDialogOpen, setIsAdminUserDialogOpen] = useState(false);

  // Drafts -------------------------------------------------------------------
  const [newCompany, setNewCompany] = useState<Omit<EnhancedCompany, "id" | "status">>(
    {
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      pinCode: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      gstNumber: "",
      panNumber: "",
    }
  );
  const [createdCompany, setCreatedCompany] = useState<EnhancedCompany | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserDraft[]>([
    { name: "", email: "", password: "" },
  ]);

  // Derived ------------------------------------------------------------------
  const filteredCompanies = companies.filter((company) =>
    [company.name, company.contactPerson, company.contactEmail]
      .join("|")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // -------------------------------------------------------------------------
  // CRUD Handlers
  // -------------------------------------------------------------------------

  const handleAddCompany = () => {
    // Simple validation ------------------------------------------------------
    const empty = Object.entries(newCompany).find(([, v]) => !v);
    if (empty) {
      toast({
        title: "Error",
        description: "Please fill in all company fields",
        variant: "destructive",
      });
      return;
    }

    // Create company ---------------------------------------------------------
    const company: EnhancedCompany = {
      id: Date.now().toString(),
      ...newCompany,
      status: UserStatus.ACTIVE,
    };
    setCompanies((prev) => [...prev, company]);
    setCreatedCompany(company);

    // Reset form -------------------------------------------------------------
    setNewCompany({
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      pinCode: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      gstNumber: "",
      panNumber: "",
    });

    setIsAddDialogOpen(false);
    setIsVerificationDialogOpen(true);
  };

  const handleVerificationComplete = () => {
    setIsVerificationDialogOpen(false);
    setIsAdminUserDialogOpen(true);
  };

  const addAdminUserField = () =>
    setAdminUsers((prev) => [...prev, { name: "", email: "", password: "" }]);

  const removeAdminUserField = (index: number) =>
    setAdminUsers((prev) => prev.filter((_, i) => i !== index));

  const updateAdminUserField = (
    index: number,
    field: keyof AdminUserDraft,
    value: string
  ) =>
    setAdminUsers((prev) => {
      const updated = [...prev];
      updated[index] = { ...prev[index], [field]: value };
      return updated;
    });

  const handleCreateAdminUsers = () => {
    const valid = adminUsers.filter((u) => u.name && u.email && u.password);
    if (!valid.length) {
      toast({
        title: "Error",
        description: "Please fill in at least one complete admin user",
        variant: "destructive",
      });
      return;
    }

    // Simulate creation ------------------------------------------------------
    valid.forEach((u) =>
      console.log("Creating Company Admin", {
        ...u,
        role: UserRole.COMPANY_ADMIN,
        companyId: createdCompany?.id,
      })
    );

    toast({
      title: "Success",
      description: `Company "${createdCompany?.name}" created with ${valid.length} admin user(s)`,
    });

    // Reset ------------------------------------------------------------------
    setAdminUsers([{ name: "", email: "", password: "" }]);
    setCreatedCompany(null);
    setIsAdminUserDialogOpen(false);
  };

  const handleDeleteCompany = (id: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    toast({
      title: "Company Deleted",
      description: "Company and associated users have been removed",
    });
  };

  // -------------------------------------------------------------------------
  // AUTH GUARD – Only Application Admins
  // -------------------------------------------------------------------------

  if (user?.role !== UserRole.APPLICATION_ADMIN) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
            <p className="text-gray-600">
              Only System Administrators can manage companies.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // -------------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header & Create Company Button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Company Management</h2>
            <p className="text-muted-foreground">
              Register companies and their admin users
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Register Company
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> Register New Company
                </DialogTitle>
                <DialogDescription>
                  Fill in complete company details.
                </DialogDescription>
              </DialogHeader>

              {/* Company Form */}
              <div className="grid gap-6 py-4">
                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      value={newCompany.name}
                      onChange={(e) =>
                        setNewCompany({ ...newCompany, name: e.target.value })
                      }
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      value={newCompany.contactPerson}
                      onChange={(e) =>
                        setNewCompany({ ...newCompany, contactPerson: e.target.value })
                      }
                      placeholder="Contact person name"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={newCompany.address}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, address: e.target.value })
                    }
                    placeholder="Street address"
                  />
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    ["city", "City"],
                    ["state", "State"],
                    ["country", "Country"],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>{label} *</Label>
                      <Input
                        id={key}
                        value={newCompany[key as keyof typeof newCompany] as string}
                        onChange={(e) =>
                          setNewCompany({
                            ...newCompany,
                            [key]: e.target.value,
                          })
                        }
                        placeholder={label}
                      />
                    </div>
                  ))}
                </div>

                {/* Row 4 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pinCode">Pin Code *</Label>
                    <Input
                      id="pinCode"
                      value={newCompany.pinCode}
                      onChange={(e) =>
                        setNewCompany({ ...newCompany, pinCode: e.target.value })
                      }
                      placeholder="Pin/Zip code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Phone *</Label>
                    <Input
                      id="contactPhone"
                      value={newCompany.contactPhone}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          contactPhone: e.target.value,
                        })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={newCompany.contactEmail}
                    onChange={(e) =>
                      setNewCompany({
                        ...newCompany,
                        contactEmail: e.target.value,
                      })
                    }
                    placeholder="contact@company.com"
                  />
                </div>

                {/* Tax IDs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST No *</Label>
                    <Input
                      id="gstNumber"
                      value={newCompany.gstNumber}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          gstNumber: e.target.value,
                        })
                      }
                      placeholder="29ABCDE1234F1Z5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panNumber">PAN No *</Label>
                    <Input
                      id="panNumber"
                      value={newCompany.panNumber}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          panNumber: e.target.value,
                        })
                      }
                      placeholder="ABCDE1234F"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={handleAddCompany}>Register Company</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Verification Dialog */}
        <Dialog
          open={isVerificationDialogOpen}
          onOpenChange={setIsVerificationDialogOpen}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" /> Company Registered
              </DialogTitle>
              <DialogDescription className="text-center">
                {createdCompany?.name} has been successfully registered!
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <div className="text-6xl">✓</div>
            </div>
            <DialogFooter>
              <Button onClick={handleVerificationComplete} className="w-full">
                Create Admin Users
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Users Dialog */}
        <Dialog
          open={isAdminUserDialogOpen}
          onOpenChange={setIsAdminUserDialogOpen}
        >
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> Create Company Admin Users
              </DialogTitle>
              <DialogDescription>
                Create admin users for {createdCompany?.name}. You can add multiple admin users.
              </DialogDescription>
            </DialogHeader>

            {/* Admin Users Form */}
            <div className="space-y-6 py-4">
              {adminUsers.map((u, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">Admin User {idx + 1}</h4>
                    {adminUsers.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAdminUserField(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4">
                    {(
                      [
                        ["name", "Full Name"],
                        ["email", "Email"],
                        ["password", "Password"],
                      ] as [keyof AdminUserDraft, string][]
                    ).map(([field, label]) => (
                      <div className="space-y-2" key={field}>
                        <Label>{label} *</Label>
                        <Input
                          type={field === "password" ? "password" : undefined}
                          value={u[field]}
                          onChange={(e) =>
                            updateAdminUserField(idx, field, e.target.value)
                          }
                          placeholder={label}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addAdminUserField} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Another Admin User
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateAdminUsers}>Create Admin Users</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" /> Search Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search by company name, contact person, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </CardContent>
        </Card>

        {/* Companies List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Registered Companies ({filteredCompanies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Details</TableHead>
                  <TableHead>Contact Information</TableHead>
                  <TableHead>Tax Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((c) => (
                  <TableRow key={c.id}>
                    {/* Company Info */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium">
                          <Building2 className="h-4 w-4 text-muted-foreground" /> {c.name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {c.city}, {c.state}, {c.country}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.address}</div>
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium flex items-center gap-2">
                          <Users className="h-3 w-3" /> {c.contactPerson}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" /> {c.contactEmail}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" /> {c.contactPhone}
                        </div>
                      </div>
                    </TableCell>

                    {/* Tax */}
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>GST: {c.gstNumber}</div>
                        <div>PAN: {c.panNumber}</div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant={c.status === UserStatus.ACTIVE ? "default" : "secondary"}
                      >
                        {c.status}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCompany(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
