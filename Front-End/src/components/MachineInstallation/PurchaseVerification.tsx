
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

interface PurchasedMachine {
  id: string;
  model: string;
  serialNumber: string;
  batchNumber: string;
  invoiceNumber: string;
  purchaseDate: string;
  isInstalled: boolean;
  dealerId: string;
}

interface PurchaseVerificationProps {
  onMachineSelected: (machine: PurchasedMachine) => void;
  selectedMachine: PurchasedMachine | null;
}

// Mock data for purchased machines - in real app this would come from API
const mockPurchasedMachines: PurchasedMachine[] = [
  {
    id: '1',
    model: 'CLX-5000 Standard',
    serialNumber: 'CLX5000-12345-AB',
    batchNumber: 'BTH-2024-001',
    invoiceNumber: 'INV-2024-0001',
    purchaseDate: '2024-01-15',
    isInstalled: false,
    dealerId: 'dealer1'
  },
  {
    id: '2',
    model: 'RVX-300 Advanced',
    serialNumber: 'RVX300-67890-CD',
    batchNumber: 'BTH-2024-002',
    invoiceNumber: 'INV-2024-0002',
    purchaseDate: '2024-01-20',
    isInstalled: true,
    dealerId: 'dealer1'
  },
  {
    id: '3',
    model: 'CLX-6000 Pro',
    serialNumber: 'CLX6000-24680-EF',
    batchNumber: 'BTH-2024-003',
    invoiceNumber: 'INV-2024-0003',
    purchaseDate: '2024-02-01',
    isInstalled: false,
    dealerId: 'dealer1'
  }
];

const PurchaseVerification = ({ onMachineSelected, selectedMachine }: PurchaseVerificationProps) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMachines, setFilteredMachines] = useState<PurchasedMachine[]>([]);

  useEffect(() => {
    // Filter machines for current dealer and search term
    const userDealerId = user?.dealerId || 'dealer1';
    const machines = mockPurchasedMachines.filter(machine => 
      machine.dealerId === userDealerId &&
      (machine.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
       machine.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
       machine.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
       machine.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredMachines(machines);
  }, [searchTerm, user]);

  const availableMachines = filteredMachines.filter(machine => !machine.isInstalled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Select Machine from Purchase Records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search Purchased Machines</Label>
          <Input
            id="search"
            placeholder="Search by model, serial number, batch number, or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {availableMachines.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No uninstalled machines found for your purchases
            </div>
          ) : (
            availableMachines.map((machine) => (
              <div
                key={machine.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedMachine?.id === machine.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onMachineSelected(machine)}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-medium">{machine.model}</div>
                    <div className="text-sm text-muted-foreground">
                      Serial: {machine.serialNumber}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Batch: {machine.batchNumber}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Invoice: {machine.invoiceNumber}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Purchased: {new Date(machine.purchaseDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {selectedMachine?.id === machine.id && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Available
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredMachines.filter(machine => machine.isInstalled).length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Already Installed</h4>
            <div className="space-y-2">
              {filteredMachines.filter(machine => machine.isInstalled).map((machine) => (
                <div
                  key={machine.id}
                  className="border rounded-lg p-3 bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-medium text-muted-foreground">{machine.model}</div>
                      <div className="text-sm text-muted-foreground">
                        Serial: {machine.serialNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Batch: {machine.batchNumber}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <Badge variant="outline" className="bg-gray-100 text-gray-600">
                        Installed
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PurchaseVerification;
