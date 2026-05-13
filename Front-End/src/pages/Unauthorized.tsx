import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="p-3 rounded-full bg-red-100">
            <ShieldAlert className="h-12 w-12 text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
        </p>
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
          <div className="text-sm text-gray-500">
            You are logged in as: {user?.name} ({user?.email})
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
