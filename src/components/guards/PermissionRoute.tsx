/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { ModuleKey, PermissionAction } from '../../types/rbac';
import { Role } from '../../types/library';

interface PermissionRouteProps {
  module?: ModuleKey;
  action?: PermissionAction;
  allowedRoles?: Role[];
}

export default function PermissionRoute({
  module,
  action = 'view',
  allowedRoles,
}: PermissionRouteProps) {
  const { user, isLoading, logout } = useAuth();
  const { can, isAdmin, hasActiveStatus } = usePermission();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-slate-500 font-semibold">
        Verifying permissions...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasActiveStatus) {
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

  // Check allowed roles if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleUpper = (user.role || 'STUDENT').toUpperCase();
    const roleMatch = allowedRoles.some((r) => r.toUpperCase() === userRoleUpper);
    if (!roleMatch) {
      return <Navigate to="/access-denied" state={{ from: location, message: 'Access Denied — You do not have permission to access this feature.' }} replace />;
    }
  }

  // Admins always have access
  if (isAdmin) {
    return <Outlet />;
  }

  // If a specific module is specified, check granular permission
  if (module) {
    const hasPerm = can(module, action);
    if (!hasPerm) {
      return (
        <Navigate
          to="/access-denied"
          state={{
            from: location,
            module,
            action,
            message: 'Access Denied — You do not have permission to access this feature.',
          }}
          replace
        />
      );
    }
  }

  return <Outlet />;
}
