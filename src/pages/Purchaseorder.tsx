import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Plus, Download, Eye } from 'lucide-react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as api from '../services/api';
import debounce from 'lodash/debounce';

const getStatusBadge = (status: string) => {
  const variants: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    partially_completed: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
  };
  const display = status === 'partially_completed' ? 'Partially Completed' : status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge className={variants[status] || 'bg-gray-100'}>{display}</Badge>;
};

const PurchaseOrders = () => {
  const { user: currentUser } = useAuth();

  const isDealerUser = useMemo(
    () => currentUser?.role === UserRole.DEALER_ADMIN || currentUser?.role === UserRole.DEALER_EMPLOYEE,
    [currentUser]
  );
  const isCompanyUser = useMemo(
    () => currentUser?.role === UserRole.COMPANY_ADMIN || currentUser?.role === UserRole.COMPANY_EMPLOYEE,
    [currentUser]
  );
  const isAdmin = useMemo(() => currentUser?.role === UserRole.APPLICATION_ADMIN, [currentUser]);

  const canCreateOrder = useMemo(
    () => isDealerUser || isCompanyUser || isAdmin,
    [isDealerUser, isCompanyUser, isAdmin]
  );

  const [orders, setOrders] = useState<api.PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<api.PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDealer, setFilterDealer] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dealersList, setDealersList] = useState<{ id: number; name: string }[]>([]);

  // Create order dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    dealer_id: undefined as number | undefined,
    item_name: '',
    item_code: '',
    product_code: '',
    order_quantity: 0,
    remarks: '',
  });
  const [itemSearch, setItemSearch] = useState('');
  const [itemSuggestions, setItemSuggestions] = useState<api.ItemMaster[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // For company/system admin to select dealer
  const [availableDealers, setAvailableDealers] = useState<{ id: number; name: string }[]>([]);

  // Confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<api.PurchaseOrder | null>(null);
  const [confirmQuantity, setConfirmQuantity] = useState<number>(0);
  const [confirmHistory, setConfirmHistory] = useState<api.Confirmation[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await api.fetchOrders();
      setOrders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Load dealers for company/admin
  useEffect(() => {
  if ((isCompanyUser || isAdmin) && !availableDealers.length) {
    const loadDealers = async () => {
      try {
        const dealers = await api.fetchDealers();
        setAvailableDealers(dealers);
      } catch (err) {
        console.error("Failed to load dealers:", err);
      }
    };
    loadDealers();
  }
}, [isCompanyUser, isAdmin, availableDealers.length]);

  useEffect(() => {
    if ((isCompanyUser || isAdmin) && orders.length) {
      const unique = Array.from(new Map(orders.map(o => [o.dealer, { id: o.dealer, name: o.dealer_name }])).values());
      setDealersList(unique);
    }
  }, [orders, isCompanyUser, isAdmin]);

  useEffect(() => {
    let filtered = [...orders];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o => o.dealer_name.toLowerCase().includes(term) || o.item_name.toLowerCase().includes(term));
    }
    if (filterDealer !== 'all') filtered = filtered.filter(o => o.dealer.toString() === filterDealer);
    if (filterStatus !== 'all') filtered = filtered.filter(o => o.status === filterStatus);
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setFilteredOrders(filtered);
  }, [orders, searchTerm, filterDealer, filterStatus]);

  const debouncedItemSearch = useMemo(
    () => debounce(async (query: string) => {
      if (query.length >= 2) {
        const results = await api.itemSearch(query);
        setItemSuggestions(results);
        setShowSuggestions(true);
      } else {
        setItemSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedItemSearch(itemSearch);
    return () => debouncedItemSearch.cancel();
  }, [itemSearch, debouncedItemSearch]);

  const handleSelectItem = (item: api.ItemMaster) => {
    setNewOrder({
      ...newOrder,
      item_name: item.itemname,
      item_code: item.itemcode,
      product_code: item.productcode,
    });
    setItemSearch(item.itemname);
    setShowSuggestions(false);
  };

  const handleCreateOrder = async () => {
    if (newOrder.order_quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    try {
      const payload: any = {
        item_name: newOrder.item_name,
        item_code: newOrder.item_code,
        product_code: newOrder.product_code,
        order_quantity: newOrder.order_quantity,
        remarks: newOrder.remarks,
      };
      // Add dealer_id only if the user is not a dealer (company or admin)
      if (!isDealerUser && newOrder.dealer_id) {
        payload.dealer_id = newOrder.dealer_id;
      }
      await api.createOrder(payload);
      setCreateOpen(false);
      setNewOrder({
        dealer_id: undefined,
        item_name: '',
        item_code: '',
        product_code: '',
        order_quantity: 0,
        remarks: '',
      });
      setItemSearch('');
      loadOrders();
    } catch (err) {
      alert('Failed to create order');
    }
  };

  const handleConfirmOrder = async () => {
    if (!selectedOrder) return;
    if (confirmQuantity <= 0 || confirmQuantity > selectedOrder.pending_quantity) {
      alert(`Quantity must be between 1 and ${selectedOrder.pending_quantity}`);
      return;
    }
    try {
      await api.confirmOrder(selectedOrder.id, confirmQuantity);
      setConfirmDialogOpen(false);
      setConfirmQuantity(0);
      loadOrders();
    } catch (err) {
      alert('Confirmation failed');
    }
  };

  const showHistory = async (order: api.PurchaseOrder) => {
    try {
      const history = await api.fetchConfirmations(order.id);
      setConfirmHistory(history);
      setHistoryDialogOpen(true);
    } catch (err) {
      alert('Could not load history');
    }
  };

  const exportToCSV = () => {
    const headers = ['Dealer', 'Item', 'Item Code', 'Order Qty', 'Pending Qty', 'Status', 'Order Date'];
    const rows = filteredOrders.map(o => [o.dealer_name, o.item_name, o.item_code, o.order_quantity, o.pending_quantity, o.status, o.created_at]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchase_orders.csv';
    a.click();
  };

  if (!isDealerUser && !isCompanyUser && !isAdmin) {
    return <DashboardLayout><div className="p-8 text-red-500">Unauthorized</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Purchase Orders</h2>
          {canCreateOrder && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Order
            </Button>
          )}
          {(isCompanyUser || isAdmin) && (
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          )}
        </div>

        {(isCompanyUser || isAdmin) && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input placeholder="Search dealer or item..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
                </div>
                <Select value={filterDealer} onValueChange={setFilterDealer}>
                  <SelectTrigger><SelectValue placeholder="All Dealers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dealers</SelectItem>
                    {dealersList.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partially_completed">Partially Completed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Orders</CardTitle><CardDescription>List of all purchase orders</CardDescription></CardHeader>
          <CardContent>
            {loading ? <div className="py-8 text-center">Loading...</div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Order Qty</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>{order.dealer_name}</TableCell>
                      <TableCell>{order.item_name}</TableCell>
                      <TableCell>{order.item_code}</TableCell>
                      <TableCell>{order.order_quantity}</TableCell>
                      <TableCell>{order.pending_quantity}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => showHistory(order)}><Eye className="h-3 w-3 mr-1" /> History</Button>
                        {(isCompanyUser || isAdmin) && order.status !== 'completed' && (
                          <Button size="sm" onClick={() => { setSelectedOrder(order); setConfirmQuantity(0); setConfirmDialogOpen(true); }}>
                            Confirm
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Order Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Dealer selector for company/admin */}
            {!isDealerUser && (isCompanyUser || isAdmin) && (
              <div>
                <Label>Select Dealer *</Label>
                <Select value={newOrder.dealer_id?.toString()} onValueChange={(val) => setNewOrder({ ...newOrder, dealer_id: parseInt(val) })}>
                  <SelectTrigger><SelectValue placeholder="Choose dealer" /></SelectTrigger>
                  <SelectContent>
                    {availableDealers.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Search Item</Label>
              <Input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Type item name or code..." />
              {showSuggestions && itemSuggestions.length > 0 && (
                <div className="border rounded mt-1 max-h-48 overflow-auto">
                  {itemSuggestions.map(item => (
                    <div key={item.itemcode} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleSelectItem(item)}>
                      {item.itemname} ({item.itemcode})
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div><Label>Item Name</Label><Input value={newOrder.item_name} readOnly /></div>
            <div><Label>Item Code</Label><Input value={newOrder.item_code} readOnly /></div>
            <div><Label>Product Code</Label><Input value={newOrder.product_code} readOnly /></div>
            <div><Label>Order Quantity</Label><Input type="number" value={newOrder.order_quantity} onChange={e => setNewOrder({ ...newOrder, order_quantity: parseInt(e.target.value) || 0 })} /></div>
            <div><Label>Remarks</Label><Textarea value={newOrder.remarks} onChange={e => setNewOrder({ ...newOrder, remarks: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={handleCreateOrder}>Submit Order</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Order #{selectedOrder?.id}</DialogTitle></DialogHeader>
          <div>
            <Label>Available to confirm: {selectedOrder?.pending_quantity} units</Label>
            <Input type="number" value={confirmQuantity} onChange={e => setConfirmQuantity(parseInt(e.target.value) || 0)} placeholder="Enter quantity" className="mt-2" />
          </div>
          <DialogFooter><Button onClick={handleConfirmOrder}>Confirm</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Confirmation History</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Confirmed By</TableHead><TableHead>Quantity</TableHead><TableHead>Pending After</TableHead></TableRow></TableHeader>
            <TableBody>
              {confirmHistory.map(h => (
                <TableRow key={h.id}>
                  <TableCell>{format(new Date(h.confirmed_at), 'PPP p')}</TableCell>
                  <TableCell>{h.confirmed_by_name}</TableCell>
                  <TableCell>{h.confirmed_quantity}</TableCell>
                  <TableCell>{h.pending_after}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PurchaseOrders;