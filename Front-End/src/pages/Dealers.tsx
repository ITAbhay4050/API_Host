// src/pages/Dealers.tsx
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import CreateDealerForm from "@/components/DealerManagement/CreateDealerForm";

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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Store,
  Users,
  MapPin,
  Phone,
  Mail,
  Building2,
} from "lucide-react";

import { Dealer, Company, UserRole, User } from "@/types";
import { useAuth } from "@/context/AuthContext";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

const makeAuthHeaders = (token?: string) =>
  token
    ? { Authorization: `Token ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

const normaliseDealer = (d: any): Dealer => ({
  id: String(d.id),
  companyId: String(d.company),
  name: d.name,
  contactPerson: d.name,
  contactEmail: d.email,
  contactPhone: d.phone,
  address: d.address,
});

const normaliseCompany = (c: any): Company => ({
  id: String(c.id),
  name: c.name,
  address: c.address,
  contactPerson: c.name,
  contactEmail: c.email,
  contactPhone: c.phone,
});

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
const Dealers = () => {
  const { user } = useAuth();
  const token = user?.token;

  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dRes = await fetch(`${API_BASE}/dealers/`, {
        headers: makeAuthHeaders(token),
      });
      if (!dRes.ok) throw new Error("Could not fetch dealers");
      const dJson = await dRes.json();
      const dealersNorm: Dealer[] = dJson.map(normaliseDealer);

      let companiesNorm: Company[] = [];
      if (
        user?.role === UserRole.APPLICATION_ADMIN ||
        user?.role === UserRole.COMPANY_ADMIN
      ) {
        const cRes = await fetch(`${API_BASE}/companies/`, {
          headers: makeAuthHeaders(token),
        });
        if (!cRes.ok) throw new Error("Could not fetch companies");
        const cJson = await cRes.json();
        companiesNorm = cJson.map(normaliseCompany);
      }

      setDealers(dealersNorm);
      setCompanies(companiesNorm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDealers = dealers
    .filter((d) =>
      user?.role === UserRole.COMPANY_ADMIN && user.companyId
        ? d.companyId === user.companyId
        : true,
    )
    .filter((d) => {
      const t = searchTerm.toLowerCase();
      return (
        d.name.toLowerCase().includes(t) ||
        d.contactPerson?.toLowerCase().includes(t) ||
        d.contactEmail?.toLowerCase().includes(t)
      );
    });

  const scopedCompanies =
    user?.role === UserRole.COMPANY_ADMIN && user.companyId
      ? companies.filter((c) => c.id === user.companyId)
      : companies;

  const getCompanyName = (cid: string) =>
    companies.find((c) => c.id === cid)?.name ?? "Unknown";

  const dealerCountForCompany = (cid: string) =>
    dealers.filter((d) => d.companyId === cid).length;

  const handleDealerCreated = (newDealer: Dealer, _admin: User) => {
    setDealers((prev) => [...prev, newDealer]);
    setIsAddDialogOpen(false);
  };

  const handleDeleteDealer = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/dealers/${id}/`, {
        method: "DELETE",
        headers: makeAuthHeaders(token),
      });
      if (!res.ok) throw new Error("Delete failed");
      setDealers((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">Loading…</div>
      </DashboardLayout>
    );
  }
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-red-500">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header + Add Dialog */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {user?.role === UserRole.COMPANY_ADMIN
                ? "Company Dealers"
                : "Dealers & Companies"}
            </h2>
            <p className="text-muted-foreground">
              {user?.role === UserRole.COMPANY_ADMIN
                ? "Manage dealers associated with your company"
                : "Manage dealers, their company associations, and view all companies"}
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Dealer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Dealer</DialogTitle>
                <DialogDescription>
                  Create a new dealer and its admin account.
                </DialogDescription>
              </DialogHeader>

              <CreateDealerForm
                onDealerCreated={handleDealerCreated}
                onCancel={() => setIsAddDialogOpen(false)}
                companies={scopedCompanies}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Application Admin — Company List */}
        {user?.role === UserRole.APPLICATION_ADMIN && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                All Companies ({scopedCompanies.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Dealers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedCompanies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {c.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {c.contactPerson}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {c.contactEmail}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {c.contactPhone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-xs">{c.address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Store className="h-3 w-3" />
                          {dealerCountForCompany(c.id)} Dealers
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Company Admin — Company Info */}
        {user?.role === UserRole.COMPANY_ADMIN && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Your Company
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scopedCompanies.map((c) => (
                <div key={c.id} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="text-lg font-semibold">{c.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {c.address}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Contact:</span> {c.contactPerson}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {c.contactEmail}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {c.contactPhone}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    <Store className="h-3 w-3" />
                    {dealerCountForCompany(c.id)} Dealers
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Dealers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search by dealer name, contact person, or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </CardContent>
        </Card>

        {/* Dealers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              {user?.role === UserRole.COMPANY_ADMIN ? "Company Dealers" : "Dealers"} (
              {filteredDealers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dealer</TableHead>
                  {user?.role === UserRole.APPLICATION_ADMIN && <TableHead>Company</TableHead>}
                  <TableHead>Contact</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDealers.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        {d.name}
                      </div>
                    </TableCell>

                    {user?.role === UserRole.APPLICATION_ADMIN && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="secondary">{getCompanyName(d.companyId)}</Badge>
                        </div>
                      </TableCell>
                    )}

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {d.contactPerson}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {d.contactEmail}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {d.contactPhone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-xs">{d.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDealer(d.id)}
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
};

export default Dealers;
