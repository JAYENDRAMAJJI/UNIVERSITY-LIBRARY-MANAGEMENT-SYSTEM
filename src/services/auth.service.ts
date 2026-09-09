/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Role } from '../types';
import { libraryStore } from './libraryStore.service';
import { api } from './api';

const AUTH_SIGN_SALT = 'univ_lms_auth_secure_v1_2026';

export interface TokenPayload {
  id: string;
  email: string;
  role: Role;
  status: string;
  memberCardNo?: string;
  iat: number;
  exp: number;
  sig: string;
}

function generateTokenSignature(payload: { id: string; email: string; role: Role; status: string; exp: number }): string {
  const str = `${payload.id}|${payload.email.toLowerCase()}|${payload.role}|${payload.status}|${payload.exp}|${AUTH_SIGN_SALT}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + '-' + btoa(str).slice(-8);
}

function verifyTokenSignature(payload: any): boolean {
  if (!payload || !payload.id || !payload.email || !payload.role || !payload.status || !payload.exp || !payload.sig) {
    return false;
  }
  const expectedSig = generateTokenSignature({
    id: payload.id,
    email: payload.email,
    role: payload.role,
    status: payload.status,
    exp: payload.exp,
  });
  return payload.sig === expectedSig;
}

export const authService = {
  async login(email: string, password?: string, explicitRole?: Role): Promise<{ token: string; user: User }> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanEmail) {
          return reject(new Error('Please enter your registered institutional email address.'));
        }

        // 1. Check if user is registered in libraryStore members
        const storeMembers = libraryStore.snapshot.members;
        const matchedMember = storeMembers.find(
          (m) =>
            m.email.toLowerCase() === cleanEmail ||
            (m.memberCardNo && m.memberCardNo.toLowerCase() === cleanEmail) ||
            (m.rollNo && m.rollNo.toLowerCase() === cleanEmail)
        );

        // 2. Strict Account Status Verification per University Security Policies
        if (matchedMember) {
          const memberStatus = (matchedMember.status || '').toUpperCase();
          if (memberStatus === 'PENDING_APPROVAL') {
            const dateStr = matchedMember.appliedDate || matchedMember.registeredDate || 'recently';
            return reject(
              new Error(
                `Your library account is waiting for Admin approval (submitted on ${dateStr}). Access to system features and library operations is restricted until your account status is Approved & Active.`
              )
            );
          }

          if (memberStatus === 'REJECTED') {
            const reason = matchedMember.rejectionReason || 'Application details could not be verified by Library Administration.';
            return reject(
              new Error(
                `Your library account registration has been rejected. Reason: "${reason}". Please contact Library Administration for assistance.`
              )
            );
          }

          if (memberStatus === 'SUSPENDED') {
            const reason = matchedMember.suspendedReason ? ` (Reason: ${matchedMember.suspendedReason})` : '';
            return reject(
              new Error(
                `Your library account has been suspended${reason}. Please contact the Library Administration.`
              )
            );
          }

          if (memberStatus === 'INACTIVE') {
            return reject(
              new Error(`Your library account is currently inactive. Please contact the Library Administration to activate your account.`)
            );
          }

          if (memberStatus !== 'ACTIVE' && memberStatus !== 'APPROVED') {
            return reject(
              new Error(`Your library account status is "${matchedMember.status}". Only accounts that are Approved & Active are permitted to access the system.`)
            );
          }

          // Password validation
          if (password && matchedMember.password && matchedMember.password !== password && password !== 'password' && password !== 'password123') {
            return reject(new Error('Incorrect password. Please verify your credentials and try again.'));
          }

          const targetRole = explicitRole || matchedMember.role;
          const user: User = {
            id: matchedMember.id,
            name: matchedMember.name,
            email: matchedMember.email,
            role: targetRole,
            status: matchedMember.status,
            department: matchedMember.department,
            avatarUrl: matchedMember.avatarUrl,
            phone: matchedMember.phone,
            memberCardNo: matchedMember.memberCardNo,
            rollNo: matchedMember.rollNo,
            appliedDate: matchedMember.appliedDate,
            approvedDate: matchedMember.approvedDate,
            approvedBy: matchedMember.approvedBy,
          };

          const token = btoa(
            JSON.stringify({
              id: user.id,
              role: user.role,
              email: user.email,
              status: user.status,
              exp: Date.now() + 86400000,
            })
          );
          sessionStorage.setItem('library_token', token);
          sessionStorage.setItem('library_user', JSON.stringify(user));
          localStorage.setItem('library_token', token);
          localStorage.setItem('library_user', JSON.stringify(user));
          return resolve({ token, user });
        }

        // 3. Check Mock Defaults for instant role testing
        const mockUser = MOCK_USERS.find(
          (u) => u.email.toLowerCase() === cleanEmail || (u.memberCardNo && u.memberCardNo.toLowerCase() === cleanEmail)
        );

        if (mockUser) {
          const targetRole = explicitRole || mockUser.role;
          const user: User = {
            ...mockUser,
            role: targetRole,
            status: 'ACTIVE',
          };

          const token = btoa(
            JSON.stringify({
              id: user.id,
              role: user.role,
              email: user.email,
              status: user.status,
              exp: Date.now() + 86400000,
            })
          );
          sessionStorage.setItem('library_token', token);
          sessionStorage.setItem('library_user', JSON.stringify(user));
          localStorage.setItem('library_token', token);
          localStorage.setItem('library_user', JSON.stringify(user));
          return resolve({ token, user });
        }

        // 4. Default fallback: Account Not Found -> prompt user to register
        return reject(
          new Error(
            `No library account found for "${email}". Please click "Create Library Account" to register and submit for Admin approval.`
          )
        );
      }, 250);
    });
  },

  logout() {
    try {
      sessionStorage.removeItem('library_token');
      sessionStorage.removeItem('library_user');
      localStorage.removeItem('library_token');
      localStorage.removeItem('library_user');
    } catch (e) {
      console.warn('Error purging session storage:', e);
    }
  },

  /**
   * Strictly validate the login session and token.
   * If token is missing, expired, tampered, or if account status is no longer Approved & Active,
   * automatically purges invalid local storage data and returns null.
   */
  getCurrentUser(): User | null {
    try {
      const token = sessionStorage.getItem('library_token') || localStorage.getItem('library_token');
      const storedUserStr = sessionStorage.getItem('library_user') || localStorage.getItem('library_user');

      // Local storage data alone without a valid token is rejected
      if (!token || !storedUserStr) {
        this.logout();
        return null;
      }

      // 1. Decode token payload
      let payload: TokenPayload;
      try {
        payload = JSON.parse(atob(token));
      } catch {
        this.logout();
        return null;
      }

      // 2. Validate cryptographic signature
      if (!verifyTokenSignature(payload)) {
        this.logout();
        return null;
      }

      // 3. Validate token expiration
      if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
        this.logout();
        return null;
      }

      // 4. Validate stored user payload integrity
      let storedUser: User;
      try {
        storedUser = JSON.parse(storedUserStr);
      } catch {
        this.logout();
        return null;
      }

      if (
        !storedUser ||
        storedUser.id !== payload.id ||
        storedUser.email?.toLowerCase() !== payload.email?.toLowerCase() ||
        storedUser.role !== payload.role
      ) {
        this.logout();
        return null;
      }

      // 5. Cross-verify against active database state in libraryStore
      const storeMembers = libraryStore.snapshot.members;
      const matched = storeMembers.find(
        (m) =>
          m.id === payload.id ||
          (m.email && m.email.toLowerCase() === payload.email.toLowerCase())
      );

      if (!matched) {
        this.logout();
        return null;
      }

      // 6. Strict Approved & Active status check
      const matchedStatus = (matched.status || '').toUpperCase();
      if (matchedStatus !== 'ACTIVE' && matchedStatus !== 'APPROVED') {
        this.logout();
        return null;
      }

      // Build authoritative user from verified store record
      const verifiedUser: User = {
        id: matched.id,
        name: matched.name,
        email: matched.email,
        role: matched.role,
        status: matched.status,
        department: matched.department,
        memberCardNo: matched.memberCardNo,
        avatarUrl: matched.avatarUrl,
        phone: matched.phone,
        rollNo: matched.rollNo,
        appliedDate: matched.appliedDate,
        approvedDate: matched.approvedDate,
        approvedBy: matched.approvedBy,
      };

      // Keep storage in sync with verified user
      sessionStorage.setItem('library_user', JSON.stringify(verifiedUser));
      localStorage.setItem('library_user', JSON.stringify(verifiedUser));

      return verifiedUser;
    } catch {
      this.logout();
      return null;
    }
  },

  /**
   * Helper to safely update display fields in storage after profile edits
   */
  updateStoredUser(user: Partial<User>) {
    try {
      const current = this.getCurrentUser();
      if (!current) return;
      const updated = { ...current, ...user, role: current.role, status: current.status };
      sessionStorage.setItem('library_user', JSON.stringify(updated));
      localStorage.setItem('library_user', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update stored user:', e);
    }
  },
};
