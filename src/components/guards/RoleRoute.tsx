import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

interface RoleRouteProps {
  allowedRoles: Role[];
}

export default function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex justify-center items-center h-[60vh] text-slate-500 font-semibold">Verifying permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict status verification: Only allow ACTIVE or APPROVED accounts
  const normalizedStatus = (user.status || '').toUpperCase();
  const isApprovedAndActive = normalizedStatus === 'ACTIVE' || normalizedStatus === 'APPROVED';

  if (!isApprovedAndActive) {
    logout();
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          accountStatusNotice: {
            status: user.status || 'PENDING_APPROVAL',
            message: 'Your account must be Approved & Active to perform library operations.',
          },
        }}
        replace
      />
    );
  }

  const userRoleUpper = (user.role || 'STUDENT').toUpperCase();
  const isAllowed = allowedRoles.some((r) => r.toUpperCase() === userRoleUpper);

  if (!isAllowed) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}
