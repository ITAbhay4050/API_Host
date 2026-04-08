import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Plus, Download } from 'lucide-react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// =============================================================================
// TYPES
// =============================================================================
interface PurchaseOrder {
  id: number;
  dealer_id: number;
  dealer_name: string;
  item_name: string;
  item_code: string;
  product_code: string;
  order_quantity: number;
  pending_quantity: number;
  remarks: string;
  order_date: string;
  status: 'pending' | 'partially_completed' | 'completed';
}

// =============================================================================
// STATIC DATA (mock)
// =============================================================================
let staticPurchaseOrders: PurchaseOrder[] = [
  {
    id: 1,
    dealer_id: 1,
    dealer_name: 'ABC Motors',
    item_name: 'High-Pressure Washer',
    item_code: 'HPW-2000',
    product_code: 'HPW-2000',
    order_quantity: 10,
    pending_quantity: 5,
    remarks: 'Urgent',
    order_date: '2024-03-01',
    status: 'partially_completed',
  },
  {
    id: 2,
    dealer_id: 2,
    dealer_name: 'XYZ Equipment',
    item_name: 'Industrial Vacuum Cleaner',
    item_code: 'IVC-500',
    product_code: 'IVC-500',
    order_quantity: 8,
    pending_quantity: 8,
    remarks: 'Standard',
    order_date: '2024-03-05',
    status: 'pending',
  },
  {
    id: 3,
    dealer_id: 3,
    dealer_name: 'Fast Auto Parts',
    item_name: 'Generator',
    item_code: 'GEN-1000',
    product_code: 'GEN-1000',
    order_quantity: 3,
    pending_quantity: 0,
    remarks: 'Completed',
    order_date: '2024-02-28',
    status: 'completed',
  },
];

// =============================================================================
// HELPER
// =============================================================================
const getStatusBadge = (status: string) => {
  const variants: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    partially_completed: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
  };
  const display = status === 'partially_completed' ? 'Partially Completed' : 
                   status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge className={variants[status] || 'bg-gray-100'}>{display}</Badge>;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const PurchaseOrders = () => {
  const { user: currentUser } = useAuth();

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

  // State
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [poLoading, setPoLoading] = useState(false);

  // Filters (admin only)
  const [poSearchTerm, setPoSearchTerm] = useState('');
  const [poFilterDealer, setPoFilterDealer] = useState<string>('all');
  const [poFilterItem, setPoFilterItem] = useState('');
  const [poFilterDate, setPoFilterDate] = useState('');
  const [poFilterStatus, setPoFilterStatus] = useState<string>('all');

  // Dealers list for admin filter dropdown (extracted from orders)
  const [dealersList, setDealersList] = useState<{ id: number; name: string }[]>([]);

  // Create order dialog
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    item_name: '',
    item_code: '',
    product_code: '',
    order_quantity: 0,
    remarks: '',
  });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Load orders (static simulation)
  useEffect(() => {
    setPoLoading(true);
    setTimeout(() => {
      setPurchaseOrders([...staticPurchaseOrders]);
      setFilteredOrders([...staticPurchaseOrders]);
      setPoLoading(false);
    }, 200);
  }, []);

  // Extract unique dealers for admin filter
  useEffect(() => {
    if (isAdmin && purchaseOrders.length) {
      const unique = Array.from(
        new Map(purchaseOrders.map(order => [order.dealer_id, { id: order.dealer_id, name: order.dealer_name }])).values()
      );
      setDealersList(unique);
    }
  }, [purchaseOrders, isAdmin]);

  // Filter orders (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    let filtered = [...purchaseOrders];
    if (poSearchTerm) {
      const term = poSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.dealer_name.toLowerCase().includes(term) ||
          order.item_name.toLowerCase().includes(term)
      );
    }
    if (poFilterDealer !== 'all') {
      filtered = filtered.filter((order) => order.dealer_id.toString() === poFilterDealer);
    }
    if (poFilterItem) {
      filtered = filtered.filter((order) =>
        order.item_name.toLowerCase().includes(poFilterItem.toLowerCase())
      );
    }
    if (poFilterDate) {
      filtered = filtered.filter((order) => order.order_date === poFilterDate);
    }
    if (poFilterStatus !== 'all') {
      filtered = filtered.filter((order) => order.status === poFilterStatus);
    }
    filtered.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
    setFilteredOrders(filtered);
  }, [purchaseOrders, poSearchTerm, poFilterDealer, poFilterItem, poFilterDate, poFilterStatus, isAdmin]);

  // ========== Handlers ==========
  const handleCreateOrderClick = () => {
    setNewOrder({
      item_name: '',
      item_code: '',
      product_code: '',
      order_quantity: 0,
      remarks: '',
    });
    setCreateOrderDialogOpen(true);
  };

  const handleOrderSubmit = () => {
    if (!newOrder.item_name || !newOrder.item_code || !newOrder.product_code || newOrder.order_quantity <= 0) {
      alert('Please fill all required fields and ensure quantity is positive.');
      return;
    }
    setConfirmDialogOpen(true);
  };

  const confirmCreateOrder = () => {
    setConfirmDialogOpen(false);
    const newId = Math.max(...staticPurchaseOrders.map(o => o.id), 0) + 1;
    const dealerId = currentUser?.dealerId ? parseInt(currentUser.dealerId) : 0;
    const dealerName = currentUser?.name || 'Unknown Dealer';
    const newOrderObj: PurchaseOrder = {
      id: newId,
      dealer_id: dealerId,
      dealer_name: dealerName,
      item_name: newOrder.item_name,
      item_code: newOrder.item_code,
      product_code: newOrder.product_code,
      order_quantity: newOrder.order_quantity,
      pending_quantity: newOrder.order_quantity,
      remarks: newOrder.remarks,
      order_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending',
    };
    staticPurchaseOrders.push(newOrderObj);
    setPurchaseOrders([...staticPurchaseOrders]);
    setCreateOrderDialogOpen(false);
    alert('Purchase Order Created Successfully');
  };

  const exportToCSV = () => {
    const headers = ['Dealer Name', 'Item Name', 'Item Code', 'Product Code', 'Order Quantity', 'Pending Quantity', 'Remarks', 'Order Date', 'Status'];
    const rows = filteredOrders.map(order => [
      order.dealer_name,
      order.item_name,
      order.item_code,
      order.product_code,
      order.order_quantity.toString(),
      order.pending_quantity.toString(),
      order.remarks,
      order.order_date,
      order.status,
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'purchase_orders.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>

        {isDealerUser ? (
          // ---------- DEALER VIEW ----------
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">My Purchase Orders</h3>
              <Button onClick={handleCreateOrderClick}>
                <Plus className="h-4 w-4 mr-2" /> Create Purchase Order
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>List of orders you have placed</CardDescription>
              </CardHeader>
              <CardContent>
                {poLoading ? (
                  <div className="py-8 text-center">Loading orders...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dealer Name</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Product Code</TableHead>
                        <TableHead>Order Quantity</TableHead>
                        <TableHead>Pending Quantity</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrders.filter(o => o.dealer_id === (currentUser?.dealerId ? parseInt(currentUser.dealerId) : 0)).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground">No purchase orders found.</TableCell>
                        </TableRow>
                      ) : (
                        purchaseOrders
                          .filter(o => o.dealer_id === (currentUser?.dealerId ? parseInt(currentUser.dealerId) : 0))
                          .map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>{order.dealer_name}</TableCell>
                              <TableCell>{order.item_name}</TableCell>
                              <TableCell>{order.item_code}</TableCell>
                              <TableCell>{order.product_code}</TableCell>
                              <TableCell>{order.order_quantity}</TableCell>
                              <TableCell>{order.pending_quantity}</TableCell>
                              <TableCell>{order.remarks}</TableCell>
                              <TableCell>{format(new Date(order.order_date), 'PPP')}</TableCell>
                              <TableCell>{getStatusBadge(order.status)}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        ) : isAdmin ? (
          // ---------- ADMIN VIEW ----------
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">All Purchase Orders</h3>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" /> Export to CSV
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>All Purchase Orders</CardTitle>
                <CardDescription>View and manage purchase orders from dealers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by dealer or item..."
                      value={poSearchTerm}
                      onChange={(e) => setPoSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={poFilterDealer} onValueChange={setPoFilterDealer}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Dealers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dealers</SelectItem>
                      {dealersList.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Item name"
                    value={poFilterItem}
                    onChange={(e) => setPoFilterItem(e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="Order Date"
                    value={poFilterDate}
                    onChange={(e) => setPoFilterDate(e.target.value)}
                  />
                  <Select value={poFilterStatus} onValueChange={setPoFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partially_completed">Partially Completed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {poLoading ? (
                  <div className="py-8 text-center">Loading orders...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dealer Name</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Product Code</TableHead>
                        <TableHead>Order Quantity</TableHead>
                        <TableHead>Pending Quantity</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground">No purchase orders found.</TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>{order.dealer_name}</TableCell>
                            <TableCell>{order.item_name}</TableCell>
                            <TableCell>{order.item_code}</TableCell>
                            <TableCell>{order.product_code}</TableCell>
                            <TableCell>{order.order_quantity}</TableCell>
                            <TableCell>{order.pending_quantity}</TableCell>
                            <TableCell>{order.remarks}</TableCell>
                            <TableCell>{format(new Date(order.order_date), 'PPP')}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* Create Order Dialog (static) */}
        <Dialog open={createOrderDialogOpen} onOpenChange={setCreateOrderDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>Fill in the details for your order</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Item Name *</Label>
                <Input value={newOrder.item_name} onChange={(e) => setNewOrder({ ...newOrder, item_name: e.target.value })} />
              </div>
              <div>
                <Label>Item Code *</Label>
                <Input value={newOrder.item_code} onChange={(e) => setNewOrder({ ...newOrder, item_code: e.target.value })} />
              </div>
              <div>
                <Label>Product Code *</Label>
                <Input value={newOrder.product_code} onChange={(e) => setNewOrder({ ...newOrder, product_code: e.target.value })} />
              </div>
              <div>
                <Label>Order Quantity *</Label>
                <Input type="number" value={newOrder.order_quantity || ''} onChange={(e) => setNewOrder({ ...newOrder, order_quantity: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea value={newOrder.remarks} onChange={(e) => setNewOrder({ ...newOrder, remarks: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOrderDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleOrderSubmit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Order</DialogTitle>
              <DialogDescription>Are you sure you want to save this purchase order?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmCreateOrder}>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PurchaseOrders;