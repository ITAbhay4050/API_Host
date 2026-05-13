
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Outlet, Navigate } from 'react-router-dom';
import { UserRole } from '@/types';

type PrivateRouteProps = {
  allowedRoles?: UserRole[];
};

const PrivateRoute = ({ allowedRoles }: PrivateRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If we have role restrictions and the user's role is not allowed
  if (
    allowedRoles && 
    allowedRoles.length > 0 && 
    user && 
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  // If authenticated and authorized
  if (isAuthenticated) {
    return <Outlet />;
  }

  // Default - redirect to login
  return <Navigate to="/login" replace />;
};

export default PrivateRoute;
