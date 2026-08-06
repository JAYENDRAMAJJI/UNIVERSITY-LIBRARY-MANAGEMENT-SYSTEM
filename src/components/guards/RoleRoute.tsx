import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

interface RoleRouteProps {
  allowedRoles: Role[];
}

export default function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex justify-center items-center h-[60vh] text-slate-500 font-semibold">Verifying permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRoleUpper = (user.role || 'STUDENT').toUpperCase();
  const isAllowed = allowedRoles.some((r) => r.toUpperCase() === userRoleUpper);

  if (!isAllowed) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}
