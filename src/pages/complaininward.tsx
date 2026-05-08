import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Search, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

const apiFetch = async (path: string, options: RequestInit = {}, token?: string) => {
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Token ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || err.error || "Request failed");
  }
  return res.json();
};

interface Party {
  accountmasterid: number;
  accountname: string;
}

interface BatchSearchResult {
  salesinvoicebatchdetailsid: number;
  batchno: string;
  quantity: string;
  itemcode: string;
}

interface FinishGoodDetails {
  itemcode: string;
  itemname: string;
  alternateitemname: string;
  productcode: string;
  unit: string;
  alternateunit: string;
  conversionfactor: string;
}

interface BatchDetails {
  batchno: string;
  quantity: string;
  salesinvoicebatchdetailsid: number;
}

interface CurrentUser {
  username: string;
  user_identification: string;
  user_master_id: number;
}

const ComplainInward = () => {
  const { user } = useAuth();
  const token = user?.token;

  const [activeTab, setActiveTab] = useState("general");
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [batchSearchTerm, setBatchSearchTerm] = useState("");
  const [batchSearchResults, setBatchSearchResults] = useState<BatchSearchResult[]>([]);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchSearchResult | null>(null);
  const [finishGoodDetails, setFinishGoodDetails] = useState<FinishGoodDetails | null>(null);
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [documentNo, setDocumentNo] = useState("");
  const [documentDate, setDocumentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [complainNo, setComplainNo] = useState("");
  const [visitOrComplain, setVisitOrComplain] = useState<"1" | "0">("1");
  const [complainSource, setComplainSource] = useState("");
  const [remarks, setRemarks] = useState("");
  const [expectedScheduleDate, setExpectedScheduleDate] = useState("");
  const [priority, setPriority] = useState<"1" | "2" | "3">("2");
  const [billingRequired, setBillingRequired] = useState(false);
  const [materialRequisitionType, setMaterialRequisitionType] = useState<"0" | "1">("0");

  useEffect(() => {
    if (token) {
      fetchParties();
      fetchCurrentUser();
    }
  }, [token]);

  const fetchParties = async () => {
    try {
      const data = await apiFetch("/parties/", {}, token);
      setParties(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const data = await apiFetch("/user/current/", {}, token);
      setCurrentUser(data);
    } catch (error: any) {
      console.error("Failed to fetch user:", error);
    }
  };

  const fetchNextDocumentNo = useCallback(async (date: string) => {
    try {
      const data = await apiFetch(`/complaints/next-document-no/?document_date=${date}`, {}, token);
      setDocumentNo(data.document_no);
    } catch (error: any) {
      console.error("Failed to fetch document number:", error);
    }
  }, [token]);

  useEffect(() => {
    if (documentDate) fetchNextDocumentNo(documentDate);
  }, [documentDate, fetchNextDocumentNo]);

  // Debounced batch search
  useEffect(() => {
    if (batchSearchTerm.length > 1) {
      const timer = setTimeout(() => searchBatches(), 500);
      return () => clearTimeout(timer);
    } else {
      setBatchSearchResults([]);
    }
  }, [batchSearchTerm]);

  const searchBatches = async () => {
    if (!batchSearchTerm) return;
    try {
      const params = new URLSearchParams({ search: batchSearchTerm });
      const data = await apiFetch(`/batches/search/?${params.toString()}`, {}, token);
      setBatchSearchResults(data);
      setShowBatchDropdown(true);
    } catch (error: any) {
      toast({ title: "Error", description: "Batch search failed", variant: "destructive" });
    }
  };

  const handleSelectBatch = async (batch: BatchSearchResult) => {
    setSelectedBatch(batch);
    setBatchSearchTerm(batch.batchno);
    setShowBatchDropdown(false);
    setLoading(true);
    try {
      const data = await apiFetch(`/batch-details/?batch_id=${batch.salesinvoicebatchdetailsid}`, {}, token);
      setFinishGoodDetails(data.finish_good);
      setBatchDetails(data.batch);
      toast({ title: "Success", description: "Batch details loaded" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load batch details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!selectedPartyId) { toast({ title: "Validation Error", description: "Please select a party", variant: "destructive" }); return false; }
    if (!selectedBatch) { toast({ title: "Validation Error", description: "Please select a batch number", variant: "destructive" }); return false; }
    if (!complainNo.trim()) { toast({ title: "Validation Error", description: "Please enter complaint number", variant: "destructive" }); return false; }
    if (!visitOrComplain) { toast({ title: "Validation Error", description: "Please select Visit or Complaint", variant: "destructive" }); return false; }
    if (!materialRequisitionType) { toast({ title: "Validation Error", description: "Please select Material Requisition Type", variant: "destructive" }); return false; }
    if (documentDate && new Date(documentDate) > new Date()) { toast({ title: "Validation Error", description: "Document date cannot be future", variant: "destructive" }); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        document_no: documentNo,
        document_date: documentDate,
        party_account_master_id: parseInt(selectedPartyId),
        batch_number: selectedBatch!.batchno,
        sales_invoice_batch_details_id: selectedBatch!.salesinvoicebatchdetailsid,
        complain_no: complainNo,
        visit_or_complain_wise: parseInt(visitOrComplain),
        complain_source: complainSource,
        remarks,
        expected_schedule_date: expectedScheduleDate || null,
        priority: parseInt(priority),
        billing_required: billingRequired,
        material_requisition_type: parseInt(materialRequisitionType),
      };
      await apiFetch("/complaints/submit/", { method: "POST", body: JSON.stringify(payload) }, token);
      toast({ title: "Success", description: "Complaint registered successfully" });
      // Reset form
      setSelectedPartyId("");
      setSelectedBatch(null);
      setBatchSearchTerm("");
      setFinishGoodDetails(null);
      setBatchDetails(null);
      setComplainNo("");
      setVisitOrComplain("1");
      setComplainSource("");
      setRemarks("");
      setExpectedScheduleDate("");
      setPriority("2");
      setBillingRequired(false);
      setMaterialRequisitionType("0");
      fetchNextDocumentNo(documentDate);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Complaint Entry</h2>
            <p className="text-muted-foreground">Register new complaints with batch and party information</p>
          </div>
          {currentUser && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
              <User className="h-4 w-4" />
              <span>{currentUser.user_identification}</span>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Complaint Registration Form</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="material">Material (Secondary)</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                {/* Document Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="document_no">Document No *</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="document_no" value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document_date">Document Date *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="document_date" type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} className="pl-9" max={format(new Date(), "yyyy-MM-dd")} />
                    </div>
                  </div>
                </div>

                {/* Party & Batch */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Party Name *</Label>
                    <Select value={selectedPartyId} onValueChange={setSelectedPartyId}>
                      <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                      <SelectContent>
                        {parties.map((party) => (
                          <SelectItem key={party.accountmasterid} value={String(party.accountmasterid)}>
                            {party.accountname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Batch Number *</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by batch number..."
                        value={batchSearchTerm}
                        onChange={(e) => setBatchSearchTerm(e.target.value)}
                        onFocus={() => batchSearchResults.length > 0 && setShowBatchDropdown(true)}
                        className="pl-9"
                      />
                      {showBatchDropdown && batchSearchResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                          {batchSearchResults.map((batch) => (
                            <div key={batch.salesinvoicebatchdetailsid} className="px-4 py-2 hover:bg-muted cursor-pointer border-b" onClick={() => handleSelectBatch(batch)}>
                              <div className="font-medium">{batch.batchno}</div>
                              <div className="text-xs text-muted-foreground">Qty: {batch.quantity} | Item: {batch.itemcode}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Finish Good Details Display */}
                {finishGoodDetails && (
                  <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm">Finish Good Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Item Code:</span> {finishGoodDetails.itemcode}</div>
                      <div><span className="text-muted-foreground">Item Name:</span> {finishGoodDetails.itemname}</div>
                      <div><span className="text-muted-foreground">Alt Item:</span> {finishGoodDetails.alternateitemname}</div>
                      <div><span className="text-muted-foreground">Product Code:</span> {finishGoodDetails.productcode}</div>
                      <div><span className="text-muted-foreground">Unit:</span> {finishGoodDetails.unit}</div>
                      <div><span className="text-muted-foreground">Alt Unit:</span> {finishGoodDetails.alternateunit}</div>
                      <div><span className="text-muted-foreground">Conversion:</span> {finishGoodDetails.conversionfactor}</div>
                    </div>
                    {batchDetails && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-muted-foreground">Batch No:</span> {batchDetails.batchno}</div>
                          <div><span className="text-muted-foreground">Quantity:</span> {batchDetails.quantity}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {loading && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}

                {/* Complaint Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Complaint Number *</Label>
                    <Input value={complainNo} onChange={(e) => setComplainNo(e.target.value)} placeholder="Enter complaint number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Visit or Complaint *</Label>
                    <Select value={visitOrComplain} onValueChange={(v: "1" | "0") => setVisitOrComplain(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Complaint</SelectItem>
                        <SelectItem value="0">Visit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Complain Source (Optional)</Label>
                    <Input value={complainSource} onChange={(e) => setComplainSource(e.target.value)} placeholder="e.g., Phone, Email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Schedule Date</Label>
                    <Input type="date" value={expectedScheduleDate} onChange={(e) => setExpectedScheduleDate(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter any additional remarks..." />
                </div>

                {/* Priority & Billing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Priority *</Label>
                    <Select value={priority} onValueChange={(v: "1" | "2" | "3") => setPriority(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Low</SelectItem>
                        <SelectItem value="2">Medium</SelectItem>
                        <SelectItem value="3">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox id="billing_required" checked={billingRequired} onCheckedChange={(checked) => setBillingRequired(checked === true)} />
                    <Label htmlFor="billing_required" className="cursor-pointer">Billing Required</Label>
                  </div>
                </div>

                {/* Material Requisition Type */}
                <div className="space-y-3">
                  <Label>Material Requisition Type *</Label>
                  <RadioGroup value={materialRequisitionType} onValueChange={(v: "0" | "1") => setMaterialRequisitionType(v)} className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="0" id="spare" />
                      <Label htmlFor="spare" className="cursor-pointer">Spare</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1" id="material_to_party" />
                      <Label htmlFor="material_to_party" className="cursor-pointer">Material to be issued to party</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSubmit} disabled={submitting} className="min-w-[150px]">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {submitting ? "Submitting..." : "Submit Complaint"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="material" className="min-h-[400px]">
                <div className="text-center text-muted-foreground py-12">
                  <p>Material details for later use</p>
                  <p className="text-sm mt-2">This section will be expanded in future updates</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ComplainInward;