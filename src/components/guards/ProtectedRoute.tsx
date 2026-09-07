import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute() {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex justify-center items-center h-[60vh] text-slate-500">Verifying session...</div>;
  }

  if (!user) {
    // Redirect to login but save the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict backend status verification: Only allow ACTIVE or APPROVED accounts
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
            message:
              user.status === 'PENDING_APPROVAL'
                ? 'Your library account is waiting for Admin approval. Access to system features and modules is restricted until your account status is Approved & Active.'
                : user.status === 'REJECTED'
                ? `Your library account registration was rejected (${user.rejectionReason || 'Details unverified'}).`
                : user.status === 'SUSPENDED'
                ? `Your library account has been suspended (${user.suspendedReason || 'Contact administration'}).`
                : 'Your library account is currently inactive. Please contact Library Administration to activate your account.',
          },
        }}
        replace
      />
    );
  }

  return <Outlet />;
}
