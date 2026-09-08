/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { libraryStore } from '../services/libraryStore.service';
import { ModuleKey, PermissionAction, PermissionMatrix } from '../types/rbac';

export function usePermission() {
  const { user } = useAuth();
  const [storeState, setStoreState] = useState(() => libraryStore.snapshot);

  useEffect(() => {
    const sub = libraryStore.getObservable().subscribe(setStoreState);
    return () => sub.unsubscribe();
  }, []);

  const isAdmin = useMemo(() => {
    const r = (user?.role || '').toUpperCase();
    return r === 'ADMIN' || r === 'ADMINISTRATOR';
  }, [user?.role]);

  const isStaff = useMemo(() => {
    const r = (user?.role || '').toUpperCase();
    return r === 'STAFF' || r === 'LIBRARY_STAFF' || r === 'LIBRARIAN';
  }, [user?.role]);

  const hasActiveStatus = useMemo(() => {
    if (!user) return false;
    const status = user.status || 'ACTIVE';
    return status === 'ACTIVE' || status === 'APPROVED';
  }, [user]);

  const effectivePermissions = useMemo<PermissionMatrix>(() => {
    return libraryStore.getEffectivePermissions(user);
  }, [user, storeState.rolePermissions, storeState.userPermissions]);

  const can = useCallback(
    (module: ModuleKey, action: PermissionAction): boolean => {
      return libraryStore.hasPermission(user, module, action);
    },
    [user, storeState.rolePermissions, storeState.userPermissions]
  );

  const canView = useCallback((module: ModuleKey) => can(module, 'view'), [can]);
  const canAdd = useCallback((module: ModuleKey) => can(module, 'add'), [can]);
  const canEdit = useCallback((module: ModuleKey) => can(module, 'edit'), [can]);
  const canDelete = useCallback((module: ModuleKey) => can(module, 'delete'), [can]);
  const canApprove = useCallback((module: ModuleKey) => can(module, 'approve'), [can]);
  const canReject = useCallback((module: ModuleKey) => can(module, 'reject'), [can]);
  const canPrint = useCallback((module: ModuleKey) => can(module, 'print'), [can]);
  const canExport = useCallback((module: ModuleKey) => can(module, 'export'), [can]);
  const canManage = useCallback((module: ModuleKey) => can(module, 'manage'), [can]);

  return {
    user,
    isAdmin,
    isStaff,
    hasActiveStatus,
    effectivePermissions,
    can,
    canView,
    canAdd,
    canEdit,
    canDelete,
    canApprove,
    canReject,
    canPrint,
    canExport,
    canManage,
  };
}
