import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  MapPin, 
  User, 
  FileText, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  History,
  Building,
  Phone,
  FileDigit,
  Hash
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const API_URL = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;

interface ServiceHistory {
  id: string;
  date: string;
  type: string;
  technician: string;
  description: string;
  partsReplaced: string[];
  notes: string;
  status: string;
}

interface MachineDetails {
  id: string;
  model_number?: string;
  serial_number?: string;
  batch_number?: string;
  invoice_number?: string;
  purchase_date?: string;
  installation_date?: string;
  installed_by?: string;
  location?: string;
  notes?: string;
  status?: string;
  condition?: string;
  client_company_name?: string;
  client_gst_number?: string;
  client_contact_person?: string;
  client_contact_phone?: string;
  item_name?: string;
  item_code?: string;
  photos?: Array<{ photo: string }>;
  service_history?: ServiceHistory[];
}

const MachineDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [machine, setMachine] = useState<MachineDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMachineDetails = async () => {
      if (!id || !user?.token) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/installations/${id}/`, {
          headers: {
            'Authorization': `Token ${user.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            setMachine(null);
            return;
          }
          throw new Error(`Failed to fetch machine details: ${response.status}`);
        }

        const data = await response.json();
        setMachine(data);
      } catch (error) {
        console.error("Error fetching machine details:", error);
        toast({
          title: "Error",
          description: "Failed to load machine details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMachineDetails();
  }, [id, user?.token]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!machine) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Machine Not Found</h2>
          <p className="text-muted-foreground mb-4">The machine you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/machines")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Machines
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: string = '') => {
    switch (status.toLowerCase()) {
      case 'installed':
      case 'active':
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Installed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'servicing':
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <Wrench className="h-3 w-3 mr-1" />
            Servicing
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status || 'Unknown'}
          </Badge>
        );
    }
  };

  const getConditionBadge = (condition: string = 'Good') => {
    const colorMap = {
      'Excellent': 'bg-green-100 text-green-800 border-green-300',
      'Good': 'bg-blue-100 text-blue-800 border-blue-300',
      'Fair': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Poor': 'bg-red-100 text-red-800 border-red-300'
    };
    
    return (
      <Badge variant="outline" className={colorMap[condition as keyof typeof colorMap] || 'bg-gray-100 text-gray-800 border-gray-300'}>
        {condition}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/machines")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Machine Details</h2>
              <p className="text-muted-foreground">Invoice No: {machine.invoice_number || "N/A"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusBadge(machine.status)}
            {getConditionBadge(machine.condition)}
          </div>
        </div>

        {/* Machine Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Machine Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Item Name</label>
                  <p className="font-medium">{machine.item_name || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Item Code</label>
                  <p className="font-medium">{machine.item_code || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Batch Number</label>
                  <p className="font-medium flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    {machine.batch_number || "N/A"}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Invoice Number</label>
                  <p className="font-medium flex items-center gap-2">
                    <FileDigit className="h-4 w-4" />
                    {machine.invoice_number || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Purchase Date</label>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(machine.purchase_date || "")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Installation Date</label>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(machine.installation_date || "")}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Installed By</label>
                  <p className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {machine.installed_by || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {machine.location || "N/A"}
                  </p>
                </div>
              </div>
            </div>
            
            {machine.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Installation Notes</label>
                  <p className="mt-1 text-sm">{machine.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                  <p className="font-medium">{machine.client_company_name || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">GST Number</label>
                  <p className="font-medium">{machine.client_gst_number || "N/A"}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                  <p className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {machine.client_contact_person || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Phone</label>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {machine.client_contact_phone || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        {machine.photos && machine.photos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Installation Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {machine.photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo.photo.startsWith('http') ? photo.photo : `${API_URL}${photo.photo}`}
                      alt={`Installation photo ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/300";
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Service History
            </CardTitle>
            <CardDescription>
              Service records for this machine
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!machine.service_history || machine.service_history.length === 0) ? (
              <div className="text-center py-8">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Service History</h3>
                <p className="text-muted-foreground">
                  This machine hasn't had any service records yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {machine.service_history.map((service, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          {service.type || "Service"}
                        </h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(service.date)}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        {service.status || "Completed"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-muted-foreground">Technician</label>
                        <p className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {service.technician || "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="font-medium text-muted-foreground">Description</label>
                        <p>{service.description || "No description available"}</p>
                      </div>
                    </div>
                    
                    {service.partsReplaced && service.partsReplaced.length > 0 && (
                      <div className="mt-3">
                        <label className="font-medium text-muted-foreground text-sm">Parts Replaced</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {service.partsReplaced.map((part, partIndex) => (
                            <Badge key={partIndex} variant="secondary" className="text-xs">
                              {part}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {service.notes && (
                      <div className="mt-3">
                        <label className="font-medium text-muted-foreground text-sm">Service Notes</label>
                        <p className="text-sm mt-1 flex items-start gap-2">
                          <FileText className="h-3 w-3 mt-0.5" />
                          {service.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MachineDetails;