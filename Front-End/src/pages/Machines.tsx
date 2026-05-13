import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Machine, UserRole } from "@/types";

/* ----- UI Components ----- */
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

/* ----- Constants ----- */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";
const API_URL = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;

const Machines = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  /* ----------------- Role-Based Permission ------------------ */
  const canAddMachine =
    user?.role === UserRole.COMPANY_EMPLOYEE ||
    user?.role === UserRole.COMPANY_ADMIN ||
    user?.role === UserRole.DEALER_ADMIN ||
    user?.role === UserRole.DEALER_EMPLOYEE ||
    user?.role === UserRole.SYSTEM_ADMIN;

  /* ----------------- Helper for Image URL ------------------ */
  const getImageUrl = (photoPath: string | undefined): string => {
    if (!photoPath) {
      return "";
    }
    if (photoPath.startsWith("http")) {
      return photoPath;
    }
    return `${API_URL}${photoPath.startsWith("/") ? "" : "/"}${photoPath}`;
  };

  /* ----------------- Fetch Machine Data ------------------ */
  const fetchMachines = async () => {
    setIsLoading(true);
    try {
      if (!user?.token) {
        throw new Error("Authentication token is missing.");
      }

      const res = await fetch(`${API_URL}/installations/list/`, {
        headers: {
          Authorization: `Token ${user.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch machines: ${res.statusText}`);
      }

      const data = await res.json();
      setMachines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching machines:", error);
      toast({
        title: "Error",
        description: "Failed to load machines. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchMachines();
    }
  }, [user?.token]);

  /* ----------------- Search Filter ------------------ */
  const filteredMachines = machines.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      m.item_name?.toLowerCase().includes(q) ||
      m.batch_number?.toLowerCase().includes(q) ||
      m.location?.toLowerCase().includes(q) ||
      m.client_company_name?.toLowerCase().includes(q)
    );
  });

  /* ----------------- JSX ------------------ */
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-3xl font-bold tracking-tight">Machines</h2>
          <Button
            asChild
            disabled={!canAddMachine}
            className="flex items-center gap-2"
          >
            <Link to="/machine-installation">
              <PlusCircle className="h-4 w-4" />
              New Installation
            </Link>
          </Button>
        </div>

        {/* Machine List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Machine Inventory</CardTitle>
            <div className="relative">
              <Search
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-all duration-300 ${isSearchFocused ? "text-primary" : ""}`}
              />
              <Input
                placeholder="Search machines..."
                className={`pl-8 pr-4 transition-all duration-300 ${isSearchFocused ? "w-64" : "w-48"}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
          </CardHeader>

          <CardContent>
            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
            )}

            {/* Table */}
            {!isLoading && (
              <div className="rounded-md border overflow-hidden">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="border-b bg-muted/20">
                      <tr>
                        <th className="h-12 px-4 text-left">Photo</th>
                        <th className="h-12 px-4 text-left">Item Name</th>
                        <th className="h-12 px-4 text-left">Batch Number</th>
                        <th className="h-12 px-4 text-left">Client Company</th>
                        <th className="h-12 px-4 text-left">Installed By</th>
                        <th className="h-12 px-4 text-left">Location</th>
                        <th className="h-12 px-4 text-left">Install Date</th>
                        <th className="h-12 px-4 text-right">Invoice #</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMachines.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-muted-foreground">
                            {machines.length === 0
                              ? "No machines found in the system."
                              : "No machines match your search."}
                          </td>
                        </tr>
                      ) : (
                        filteredMachines.map((machine) => (
                          <tr
                            key={machine.id}
                            className="border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/machines/${machine.id}`)}
                          >
                            <td className="p-4">
                              {machine.photos?.length > 0 ? (
                                <img
                                  src={getImageUrl(machine.photos[0].photo)}
                                  alt="Machine installation"
                                  className="w-14 h-14 object-cover rounded-md border"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/56";
                                  }}
                                />
                              ) : (
                                <div className="w-14 h-14 flex items-center justify-center bg-gray-100 text-xs rounded-md text-muted-foreground text-center">
                                  No Image
                                </div>
                              )}
                            </td>
                            <td className="p-4 font-medium">{machine.item_name || "N/A"}</td>
                            <td className="p-4 text-muted-foreground">{machine.batch_number || "N/A"}</td>
                            <td className="p-4">{machine.client_company_name || "N/A"}</td>
                            <td className="p-4">{machine.installed_by || "N/A"}</td>
                            <td className="p-4 max-w-xs truncate">{machine.location || "N/A"}</td>
                            <td className="p-4">{machine.installation_date || "—"}</td>
                            <td className="p-4 text-right">
                              <Badge variant="secondary">{machine.invoice_number || "N/A"}</Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Machines;