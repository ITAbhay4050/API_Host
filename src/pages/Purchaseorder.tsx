import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Search, Plus, Download, Eye, Trash2, X } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as api from '../services/api';
import debounce from 'lodash/debounce';

// Helper for status badges
const getStatusBadge = (status: string) => {
  const variants: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    partially_completed: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
  };
  const display = status === 'partially_completed' ? 'Partially Completed' : status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge className={variants[status] || 'bg-gray-100'}>{display}</Badge>;
};

interface AddedItem {
  id: string;
  item_name: string;
  item_code: string;
  product_code: string;
  order_quantity: number;
  remarks: string;
}

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
  const canCreateOrder = useMemo(() => isDealerUser || isCompanyUser || isAdmin, [isDealerUser, isCompanyUser, isAdmin]);

  // Orders listing state
  const [orders, setOrders] = useState<api.PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<api.PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDealer, setFilterDealer] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dealersList, setDealersList] = useState<{ id: number; name: string }[]>([]);

  // Create order modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState<number | undefined>(undefined);
  const [availableDealers, setAvailableDealers] = useState<{ id: number; name: string }[]>([]);

  // New item entry fields
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemSuggestions, setItemSuggestions] = useState<api.ItemMaster[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<api.ItemMaster | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [remarks, setRemarks] = useState('');

  // List of added items (to be submitted)
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);

  // Confirmation & history
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<api.PurchaseOrder | null>(null);
  const [confirmQuantity, setConfirmQuantity] = useState<number>(0);
  const [confirmHistory, setConfirmHistory] = useState<api.Confirmation[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // --- Data fetching ---
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
  useEffect(() => { loadOrders(); }, []);

  useEffect(() => {
    if ((isCompanyUser || isAdmin) && !availableDealers.length) {
      api.fetchDealers().then(setAvailableDealers).catch(console.error);
    }
  }, [isCompanyUser, isAdmin, availableDealers.length]);

  useEffect(() => {
    if ((isCompanyUser || isAdmin) && orders.length) {
      const unique = Array.from(new Map(orders.map(o => [o.dealer, { id: o.dealer, name: o.dealer_name }])).values());
      setDealersList(unique);
    }
  }, [orders, isCompanyUser, isAdmin]);

  // Filter orders
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

  // Debounced item search (single search bar)
  const debouncedSearch = useMemo(
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
    debouncedSearch(itemSearchQuery);
    return () => debouncedSearch.cancel();
  }, [itemSearchQuery, debouncedSearch]);

  // Select an item from suggestions
  const handleSelectItem = (item: api.ItemMaster) => {
    setSelectedItem(item);
    setItemSearchQuery(item.itemname);
    setShowSuggestions(false);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedItem(null);
    setItemSearchQuery('');
    setQuantity(0);
    setRemarks('');
  };

  // Add current item to the list
  const addItemToList = () => {
    if (!selectedItem) {
      alert('Please select an item first.');
      return;
    }
    if (quantity <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }

    const newItem: AddedItem = {
      id: crypto.randomUUID(),
      item_name: selectedItem.itemname,
      item_code: selectedItem.itemcode,
      product_code: selectedItem.productcode,
      order_quantity: quantity,
      remarks: remarks,
    };
    setAddedItems(prev => [...prev, newItem]);
    // Reset entry fields
    clearSelection();
  };

  // Remove an item from the list
  const removeItem = (id: string) => {
    setAddedItems(prev => prev.filter(item => item.id !== id));
  };

  // Submit the entire order
  const handleCreateOrder = async () => {
    if (addedItems.length === 0) {
      alert('Please add at least one item to the order.');
      return;
    }
    if (!isDealerUser && !selectedDealerId) {
      alert('Please select a dealer.');
      return;
    }

    const payload: any = {
      items: addedItems.map(({ item_name, item_code, product_code, order_quantity, remarks }) => ({
        item_name, item_code, product_code, order_quantity, remarks
      }))
    };
    if (!isDealerUser && selectedDealerId) payload.dealer_id = selectedDealerId;

    try {
      await api.createOrder(payload);
      setCreateOpen(false);
      setAddedItems([]);
      setSelectedDealerId(undefined);
      clearSelection();
      loadOrders();
    } catch (err) {
      alert('Failed to create orders');
    }
  };

  // Confirmation handlers
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
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-3xl font-bold">Purchase Orders</h2>
          <div className="flex gap-2">
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
        </div>

        {/* Filters */}
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

        {/* Orders Table */}
        <Card>
          <CardHeader><CardTitle>Orders</CardTitle><CardDescription>List of all purchase orders</CardDescription></CardHeader>
          <CardContent>
            {loading ? <div className="py-8 text-center">Loading...</div> : (
              <div className="overflow-x-auto">
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
                        <TableCell className="font-medium">{order.dealer_name}</TableCell>
                        <TableCell>{order.item_name}</TableCell>
                        <TableCell>{order.item_code}</TableCell>
                        <TableCell>{order.order_quantity}</TableCell>
                        <TableCell>{order.pending_quantity}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
                        <TableCell className="space-x-2 whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => showHistory(order)}><Eye className="h-3 w-3 mr-1" /> History</Button>
                          {(isCompanyUser || isAdmin) && order.status !== 'completed' && (
                            <Button size="sm" onClick={() => { setSelectedOrder(order); setConfirmQuantity(0); setConfirmDialogOpen(true); }}>
                              Confirm
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredOrders.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No orders found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========== CREATE ORDER MODAL ========== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[90vw] max-w-[90vw] h-[85vh] max-h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-white z-10">
            <DialogTitle className="text-2xl">Create Purchase Order</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Dealer selector for company/admin */}
            {!isDealerUser && (isCompanyUser || isAdmin) && (
              <div className="w-full md:w-1/2">
                <Label className="text-base font-semibold">Select Dealer *</Label>
                <Select value={selectedDealerId?.toString()} onValueChange={(val) => setSelectedDealerId(parseInt(val))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choose dealer" /></SelectTrigger>
                  <SelectContent>
                    {availableDealers.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Item selection section */}
            <div className="border rounded-lg p-5 bg-gray-50 space-y-4">
              <h3 className="text-lg font-semibold">Add New Item</h3>

              {/* Search input */}
              <div className="relative">
                <Label className="text-sm font-medium mb-1 block">Search Item *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="Type item name or code..."
                    className="w-full h-12 pl-10 pr-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoComplete="off"
                  />
                </div>
                {showSuggestions && itemSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-auto">
                    {itemSuggestions.map(sug => (
                      <div
                        key={sug.itemcode}
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        onClick={() => handleSelectItem(sug)}
                      >
                        <div className="font-semibold text-gray-800">{sug.itemname}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          <span className="inline-block mr-3">Code: {sug.itemcode}</span>
                          {sug.productcode && <span>Product: {sug.productcode}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected item preview (read-only) */}
              {selectedItem && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-white rounded border">
                  <div>
                    <Label className="text-xs text-gray-500">Item Name</Label>
                    <div className="font-medium">{selectedItem.itemname}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Item Code</Label>
                    <div className="font-mono text-sm">{selectedItem.itemcode}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Product Code</Label>
                    <div className="font-mono text-sm">{selectedItem.productcode || '-'}</div>
                  </div>
                </div>
              )}

              {/* Quantity and Remarks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Quantity *</Label>
                  <input
                    type="number"
                    value={quantity || ''}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    min={1}
                    placeholder="Enter quantity"
                    className="w-full h-10 px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!selectedItem}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Remarks (optional)</Label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Any notes"
                    className="w-full h-10 px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!selectedItem}
                  />
                </div>
              </div>

              {/* Add Item button */}
              <Button
                type="button"
                onClick={addItemToList}
                disabled={!selectedItem || quantity <= 0}
                className="w-full md:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Item to Order
              </Button>
            </div>

            {/* Items list table */}
            {addedItems.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 font-semibold">Items in this order</div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Product Code</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {addedItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell>{item.item_code}</TableCell>
                          <TableCell>{item.product_code || '-'}</TableCell>
                          <TableCell className="text-center">{item.order_quantity}</TableCell>
                          <TableCell>{item.remarks || '-'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                          
                        </TableRow>
                        
                      ))}

                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
              <div className="flex justify-end w-full gap-3">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateOrder} className="bg-green-600 hover:bg-green-700">
                Submit Order ({addedItems.length} items)
              </Button>
            </div>
          </div>

         
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
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Confirmation History</DialogTitle></DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Confirmed By</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Pending After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmHistory.map(h => (
                  <TableRow key={h.id}>
                    <TableCell>{format(new Date(h.confirmed_at), 'PPP p')}</TableCell>
                    <TableCell>{h.confirmed_by_name || 'System'}</TableCell>
                    <TableCell>{h.confirmed_quantity}</TableCell>
                    <TableCell>{h.pending_after}</TableCell>
                  </TableRow>
                ))}
                {confirmHistory.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No confirmations yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      
    </DashboardLayout>
  );
};

export default PurchaseOrders;