import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Eye, Plus, RefreshCw, ShoppingCart, Undo2, PackageOpen } from 'lucide-react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// API services
import {
  fetchAvailableStock,
  saveSelectedStock,
  fetchMyStock,
  fetchCompanyStock,
  addStockByCompany,
  fetchStockAudit,
  returnStock,
  fetchSoldStock,
} from '../services/dealerStockApi';

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const DealerStock = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const isDealerUser = useMemo(
    () => currentUser?.role === UserRole.DEALER_ADMIN || currentUser?.role === UserRole.DEALER_EMPLOYEE,
    [currentUser]
  );
  const isAdmin = useMemo(
    () => currentUser?.role === UserRole.APPLICATION_ADMIN ||
          currentUser?.role === UserRole.COMPANY_ADMIN ||
          currentUser?.role === UserRole.COMPANY_EMPLOYEE,
    [currentUser]
  );

  const [activeTab, setActiveTab] = useState('available');

  // ---------- Available Stock ----------
  const [availableStock, setAvailableStock] = useState<any[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedBatchNumbers, setSelectedBatchNumbers] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // ---------- My Stock ----------
  const [myStock, setMyStock] = useState<any[]>([]);
  const [myStockLoading, setMyStockLoading] = useState(false);
  const [myStockSearch, setMyStockSearch] = useState('');

  // ---------- Sold Stock ----------
  const [soldStock, setSoldStock] = useState<any[]>([]);
  const [soldStockLoading, setSoldStockLoading] = useState(false);
  const [soldStockSearch, setSoldStockSearch] = useState('');

  // ---------- Company View ----------
  const [companyStock, setCompanyStock] = useState<any[]>([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [selectedDealerId, setSelectedDealerId] = useState<string>('all');
  const [dealersList, setDealersList] = useState<{ id: number; name: string }[]>([]);
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [manualDealerId, setManualDealerId] = useState('');
  const [manualBatchNo, setManualBatchNo] = useState('');
  const [manualAdding, setManualAdding] = useState(false);

  // ---------- Audit ----------
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // ---------- Return Dialog ----------
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnBatch, setReturnBatch] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returning, setReturning] = useState(false);

  // ---------- Selling state (for loading) ----------
  const [sellingBatch, setSellingBatch] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin && companyStock.length) {
      const unique = Array.from(
        new Map(companyStock.map(item => [item.dealer, { id: item.dealer, name: item.dealer_name || `Dealer ${item.dealer}` }])).values()
      );
      setDealersList(unique);
    }
  }, [companyStock, isAdmin]);

  // ========== API Calls ==========
  const loadAvailableStock = useCallback(async () => {
    if (!isDealerUser) return;
    setAvailableLoading(true);
    try {
      const data = await fetchAvailableStock(availableSearch);
      setAvailableStock(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setAvailableLoading(false);
    }
  }, [availableSearch, isDealerUser, toast]);

  const loadMyStock = useCallback(async () => {
    if (!isDealerUser) return;
    setMyStockLoading(true);
    try {
      const data = await fetchMyStock(myStockSearch);
      setMyStock(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setMyStockLoading(false);
    }
  }, [myStockSearch, isDealerUser, toast]);

  const loadSoldStock = useCallback(async () => {
    if (!isDealerUser) return;
    setSoldStockLoading(true);
    try {
      const data = await fetchSoldStock(soldStockSearch);
      setSoldStock(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSoldStockLoading(false);
    }
  }, [soldStockSearch, isDealerUser, toast]);

  const loadCompanyStock = useCallback(async () => {
    if (!isAdmin) return;
    setCompanyLoading(true);
    try {
      const dealerId = selectedDealerId === 'all' ? null : parseInt(selectedDealerId);
      const data = await fetchCompanyStock(dealerId, companySearch);
      setCompanyStock(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCompanyLoading(false);
    }
  }, [selectedDealerId, companySearch, isAdmin, toast]);

  useEffect(() => {
    if (activeTab === 'available' && isDealerUser) loadAvailableStock();
    if (activeTab === 'my-stock' && isDealerUser) loadMyStock();
    if (activeTab === 'sold-list' && isDealerUser) loadSoldStock();
    if (activeTab === 'company-view' && isAdmin) loadCompanyStock();
  }, [activeTab, loadAvailableStock, loadMyStock, loadSoldStock, loadCompanyStock, isDealerUser, isAdmin]);

  // ========== Handlers ==========
  const handleToggleSelectBatch = (batchNumber: string) => {
    setSelectedBatchNumbers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchNumber)) newSet.delete(batchNumber);
      else newSet.add(batchNumber);
      return newSet;
    });
  };

  const handleSaveSelected = async () => {
    if (selectedBatchNumbers.size === 0) {
      toast({ title: 'No selection', description: 'Please select at least one machine.', variant: 'default' });
      return;
    }
    const selectedItems = availableStock
      .filter(item => selectedBatchNumbers.has(item.batch_number))
      .map(item => ({
        batch_number: item.batch_number,
        account_name: item.account_name,
        gst_no: item.gst_no,
        invoice_number: item.invoice_number,
        invoice_date: item.invoice_date,
        item_name: item.item_name,
        item_code: item.item_code,
        product_code: item.product_code,
      }));
    setSaving(true);
    try {
      await saveSelectedStock(selectedItems);
      toast({ title: 'Success', description: `${selectedItems.length} machine(s) added to your stock.` });
      setSelectedBatchNumbers(new Set());
      loadAvailableStock();
      loadMyStock();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSell = (stockItem: any) => {
    setSellingBatch(stockItem.batch_number);
    navigate('/machine-installation', {
      state: {
        prefillFromSell: true,
        stockItem: {
          batch_number: stockItem.batch_number,
          item_name: stockItem.item_name,
          item_code: stockItem.item_code,
          invoice_number: stockItem.invoice_number,
          purchase_date: stockItem.invoice_date,
        }
      }
    });
    setSellingBatch(null);
  };

  const handleReturnClick = (batchNumber: string) => {
    setReturnBatch(batchNumber);
    setReturnReason('');
    setReturnDialogOpen(true);
  };

  const handleReturnConfirm = async () => {
    if (!returnReason.trim()) {
      toast({ title: 'Reason required', description: 'Please provide a reason for return.', variant: 'destructive' });
      return;
    }
    setReturning(true);
    try {
      await returnStock(returnBatch, returnReason);
      toast({ title: 'Returned', description: 'Stock has been returned.' });
      setReturnDialogOpen(false);
      loadMyStock();
      loadSoldStock(); // Refresh sold list in case of returns (if needed)
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setReturning(false);
    }
  };

  const handleManualAdd = async () => {
    if (!manualDealerId || !manualBatchNo.trim()) {
      toast({ title: 'Missing fields', description: 'Please select a dealer and enter batch number.', variant: 'destructive' });
      return;
    }
    setManualAdding(true);
    try {
      await addStockByCompany(parseInt(manualDealerId), manualBatchNo.trim());
      toast({ title: 'Added', description: 'Machine added to dealer stock.' });
      setManualAddOpen(false);
      setManualDealerId('');
      setManualBatchNo('');
      loadCompanyStock();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setManualAdding(false);
    }
  };

  const handleViewAudit = async (stockId: number) => {
    setAuditOpen(true);
    setAuditLoading(true);
    try {
      const logs = await fetchStockAudit(stockId);
      setAuditLogs(logs);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setAuditLoading(false);
    }
  };

  // ========== Render Helpers ==========
  const renderAvailableTable = () => {
    if (availableLoading) return <Skeleton className="h-64 w-full" />;
    if (availableStock.length === 0) return <div className="text-center py-8 text-muted-foreground">No stock available from supplier.</div>;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Select</TableHead>
            <TableHead>Item Name</TableHead>
            <TableHead>Batch No.</TableHead>
            <TableHead>Invoice No.</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {availableStock.map((item) => (
            <TableRow key={item.batch_number}>
              <TableCell>
                <Checkbox
                  checked={selectedBatchNumbers.has(item.batch_number)}
                  onCheckedChange={() => handleToggleSelectBatch(item.batch_number)}
                  disabled={item.already_in_stock}
                />
              </TableCell>
              <TableCell>{item.item_name}</TableCell>
              <TableCell>{item.batch_number}</TableCell>
              <TableCell>{item.invoice_number}</TableCell>
              <TableCell>{item.invoice_date ? format(new Date(item.invoice_date), 'PPP') : '-'}</TableCell>
              <TableCell>
                {item.already_in_stock ? (
                  <Badge variant="secondary">Already in Stock</Badge>
                ) : (
                  <Badge variant="outline">Available</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderMyStockTable = () => {
    if (myStockLoading) return <Skeleton className="h-64 w-full" />;
    if (myStock.length === 0) return <div className="text-center py-8 text-muted-foreground">You have no stock yet. Go to "Available Stock" tab to add.</div>;
    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            Total Stock: <span className="font-bold text-foreground">{myStock.length}</span> items
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Batch No.</TableHead>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myStock.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.item_name}</TableCell>
                <TableCell>{item.batch_number}</TableCell>
                <TableCell>{item.invoice_number}</TableCell>
                <TableCell>{item.invoice_date ? format(new Date(item.invoice_date), 'PPP') : '-'}</TableCell>
                <TableCell><Badge variant="outline">{item.source}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSell(item)}
                      disabled={sellingBatch === item.batch_number}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Sell
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReturnClick(item.batch_number)}
                    >
                      <Undo2 className="h-3 w-3 mr-1" />
                      Return
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </>
    );
  };

  const renderSoldStockTable = () => {
    if (soldStockLoading) return <Skeleton className="h-64 w-full" />;
    if (soldStock.length === 0) return <div className="text-center py-8 text-muted-foreground">No sold stock records found.</div>;
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Batch No.</TableHead>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead>Sold Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Installation Date</TableHead>
              <TableHead>Sold By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {soldStock.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.item_name}</TableCell>
                <TableCell>{item.batch_number}</TableCell>
                <TableCell>{item.invoice_number}</TableCell>
                <TableCell>{item.purchase_date ? format(new Date(item.purchase_date), 'PPP') : '-'}</TableCell>
                <TableCell>{item.sold_date ? format(new Date(item.sold_date), 'PPP pp') : '-'}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{item.customer_company_name || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{item.customer_contact_person} | {item.customer_contact_phone}</div>
                  </div>
                </TableCell>
                <TableCell>{item.installation_date ? format(new Date(item.installation_date), 'PPP') : '-'}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{item.sold_by_name || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{item.sold_by_role || 'N/A'}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => handleViewAudit(item.id)}>
                    <Eye className="h-3 w-3 mr-1" /> Audit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderCompanyStockTable = () => {
    if (companyLoading) return <Skeleton className="h-64 w-full" />;
    if (companyStock.length === 0) return <div className="text-center py-8 text-muted-foreground">No stock found for the selected filters.</div>;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dealer</TableHead>
            <TableHead>Item Name</TableHead>
            <TableHead>Batch No.</TableHead>
            <TableHead>Invoice No.</TableHead>
            <TableHead>Selected By Dealer</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companyStock.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.dealer_name || item.dealer}</TableCell>
              <TableCell>{item.item_name}</TableCell>
              <TableCell>{item.batch_number}</TableCell>
              <TableCell>{item.invoice_number}</TableCell>
              <TableCell>{item.is_selected_by_dealer ? <Badge>Yes</Badge> : <Badge variant="outline">Company Added</Badge>}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => handleViewAudit(item.id)}>
                  <Eye className="h-3 w-3 mr-1" /> Audit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Authorization guard
  if (!isDealerUser && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-red-500">You are not authorized to view this page.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Dealer Stock Management</h2>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            {isDealerUser && <TabsTrigger value="available">Available Stock</TabsTrigger>}
            {isDealerUser && <TabsTrigger value="my-stock">My Stock</TabsTrigger>}
            {isDealerUser && <TabsTrigger value="sold-list">Sold List</TabsTrigger>}
            {isAdmin && <TabsTrigger value="company-view">Company View</TabsTrigger>}
          </TabsList>

          {/* Dealer: Available Stock */}
          {isDealerUser && (
            <TabsContent value="available" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Select Machines to Add to Your Stock</CardTitle>
                  <CardDescription>Choose from the list of machines available from your supplier.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by batch, item name, code..."
                        value={availableSearch}
                        onChange={(e) => setAvailableSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <Button onClick={loadAvailableStock} variant="outline">Refresh</Button>
                    <Button onClick={handleSaveSelected} disabled={saving || selectedBatchNumbers.size === 0}>
                      {saving ? 'Saving...' : `Add Selected (${selectedBatchNumbers.size})`}
                    </Button>
                  </div>
                  {renderAvailableTable()}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Dealer: My Stock */}
          {isDealerUser && (
            <TabsContent value="my-stock" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>My Stock</CardTitle>
                  <CardDescription>Machines you have already added to your inventory.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by batch, item name..."
                        value={myStockSearch}
                        onChange={(e) => setMyStockSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <Button onClick={loadMyStock} variant="outline">Refresh</Button>
                  </div>
                  {renderMyStockTable()}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Dealer: Sold List */}
          {isDealerUser && (
            <TabsContent value="sold-list" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sold Machines</CardTitle>
                  <CardDescription>History of all sold machines with installation details.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by batch, item name..."
                        value={soldStockSearch}
                        onChange={(e) => setSoldStockSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <Button onClick={loadSoldStock} variant="outline">Refresh</Button>
                  </div>
                  {renderSoldStockTable()}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Company / Admin View */}
          {isAdmin && (
            <TabsContent value="company-view" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Dealers' Stock</CardTitle>
                  <CardDescription>Monitor and manage stock across all dealers.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by batch, item, dealer..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <Select value={selectedDealerId} onValueChange={setSelectedDealerId}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Dealers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Dealers</SelectItem>
                        {dealersList.map(dealer => (
                          <SelectItem key={dealer.id} value={dealer.id.toString()}>{dealer.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={loadCompanyStock} variant="outline">Refresh</Button>
                    <Button onClick={() => setManualAddOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Add Manually
                    </Button>
                  </div>
                  {renderCompanyStockTable()}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Manual Add Dialog */}
        <Dialog open={manualAddOpen} onOpenChange={setManualAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Stock Manually</DialogTitle>
              <DialogDescription>Add a machine to a dealer's stock using batch number.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Dealer</Label>
                <Select value={manualDealerId} onValueChange={setManualDealerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dealer" />
                  </SelectTrigger>
                  <SelectContent>
                    {dealersList.map(dealer => (
                      <SelectItem key={dealer.id} value={dealer.id.toString()}>{dealer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Batch Number</Label>
                <Input placeholder="Enter batch number" value={manualBatchNo} onChange={(e) => setManualBatchNo(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManualAddOpen(false)}>Cancel</Button>
              <Button onClick={handleManualAdd} disabled={manualAdding}>{manualAdding ? 'Adding...' : 'Add'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Return Dialog */}
        <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Return Machine</DialogTitle>
              <DialogDescription>Please provide a reason for returning this machine.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Batch Number</Label>
                <Input value={returnBatch} disabled />
              </div>
              <div>
                <Label>Reason for Return</Label>
                <Textarea
                  placeholder="Enter reason..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleReturnConfirm} disabled={returning}>
                {returning ? 'Processing...' : 'Confirm Return'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Audit Dialog */}
        <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Audit Trail</DialogTitle>
              <DialogDescription>History of changes for this stock item.</DialogDescription>
            </DialogHeader>
            {auditLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-4">No audit records found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                      <TableCell>{log.action_by_name}</TableCell>
                      <TableCell>{log.action_by_role}</TableCell>
                      <TableCell>{format(new Date(log.action_time), 'PPP pp')}</TableCell>
                      <TableCell>{log.remarks || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAuditOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default DealerStock;