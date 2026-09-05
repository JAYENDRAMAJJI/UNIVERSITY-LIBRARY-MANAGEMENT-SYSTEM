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

  // Strict backend status verification: Block unapproved, suspended, or rejected users
  if (user.status && user.status !== 'ACTIVE' && user.status !== 'APPROVED') {
    logout();
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          accountStatusNotice: {
            status: user.status,
            message:
              user.status === 'PENDING_APPROVAL'
                ? 'Your library account is waiting for Admin approval before you can access portal services.'
                : user.status === 'REJECTED'
                ? `Your library account registration was rejected (${user.rejectionReason || 'Details unverified'}).`
                : 'Your library account has been suspended. Please contact the Library Administration.',
          },
        }}
        replace
      />
    );
  }

  return <Outlet />;
}
