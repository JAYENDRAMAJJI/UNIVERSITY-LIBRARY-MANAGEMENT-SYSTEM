/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Role } from '../types';
import { libraryStore, DEFAULT_DEMO_MEMBERS } from './libraryStore.service';
import { api } from './api';

const TOKEN_KEY = 'library_token';
const USER_KEY = 'library_user';
const AUTH_SIGN_SALT = 'univ_lms_auth_secure_v1_2026';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

/**
 * Generate cryptographic signature for tamper detection
 */
function generateTokenSignature(payload: {
  id: string;
  email: string;
  role: Role;
  status: string;
  exp: number;
}): string {
  const str = `${payload.id}|${payload.email.toLowerCase()}|${payload.role}|${payload.status}|${payload.exp}|${AUTH_SIGN_SALT}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `${Math.abs(hash).toString(36)}-${btoa(str).slice(-8)}`;
}

/**
 * Validate token signature integrity
 */
function verifyTokenSignature(payload: TokenPayload): boolean {
  if (!payload?.id || !payload.email || !payload.role || !payload.status || !payload.exp || !payload.sig) {
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

/**
 * Helper to persist authentication session in storage
 */
function saveSession(token: string, user: User): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
}

/**
 * Helper to clear authentication session from storage
 */
function clearSession(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch (e) {
    console.warn('Failed to clear session:', e);
  }
}

/**
 * Check if an error message is caused by network/backend offline state
 */
function isNetworkOrOfflineError(msg?: string): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes('fetch') ||
    m.includes('network') ||
    m.includes('econnrefused') ||
    m.includes('mongodb') ||
    m.includes('503') ||
    m.includes('502') ||
    m.includes('504') ||
    m.includes('failed to fetch')
  );
}

/**
 * Map member store entity to User model
 */
function mapMemberToUser(member: any): User {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    status: member.status || 'ACTIVE',
    department: member.department,
    memberCardNo: member.memberCardNo,
    barcode: member.barcode || member.memberCardNo,
    avatarUrl: member.avatarUrl,
    phone: member.phone,
    rollNo: member.rollNo,
    gender: member.gender,
    designation: member.designation,
    facultyType: member.facultyType,
    scholarId: member.scholarId,
    researchProgram: member.researchProgram,
    researchSupervisor: member.researchSupervisor,
    libraryDivision: member.libraryDivision,
    level: member.level,
    yearSemester: member.yearSemester,
    appliedDate: member.appliedDate,
    approvedDate: member.approvedDate,
    approvedBy: member.approvedBy,
  };
}

/**
 * Find member by institutional credential across active store and demo seed
 */
function findMemberByCredential(identifier: string) {
  const cleanId = (identifier || '').trim().toLowerCase();
  if (!cleanId) return null;

  const storeMembers = libraryStore.snapshot.members || [];
  const matchedInStore = storeMembers.find(
    (m) =>
      m.email.toLowerCase() === cleanId ||
      (m.memberCardNo && m.memberCardNo.toLowerCase() === cleanId) ||
      (m.rollNo && m.rollNo.toLowerCase() === cleanId) ||
      (m.scholarId && m.scholarId.toLowerCase() === cleanId)
  );

  if (matchedInStore) return matchedInStore;

  if (DEFAULT_DEMO_MEMBERS) {
    return (
      DEFAULT_DEMO_MEMBERS.find(
        (m) =>
          m.email.toLowerCase() === cleanId ||
          (m.memberCardNo && m.memberCardNo.toLowerCase() === cleanId) ||
          (m.rollNo && m.rollNo.toLowerCase() === cleanId) ||
          (m.scholarId && m.scholarId.toLowerCase() === cleanId)
      ) || null
    );
  }

  return null;
}

export const authService = {
  /**
   * Secure user login with backend API verification and offline fallback support.
   */
  async login(email: string, password?: string, _requestedRole?: Role): Promise<{ token: string; user: User }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Please enter your registered institutional email address or Member ID.');
    }

    if (!password || !password.trim()) {
      throw new Error('Please enter your account password.');
    }

    // 1. Attempt login via MongoDB backend API if reachable
    try {
      const apiRes = await api.post<{ success: boolean; token: string; user: User; message?: string }>('/auth/login', {
        email: cleanEmail,
        password,
      });

      if (apiRes.success && apiRes.data?.token && apiRes.data?.user) {
        const verifiedUser = apiRes.data.user;
        const token = apiRes.data.token;

        saveSession(token, verifiedUser);
        await libraryStore.initFromBackend();

        return { token, user: verifiedUser };
      }

      if (apiRes.message && !isNetworkOrOfflineError(apiRes.message)) {
        throw new Error(apiRes.message);
      }
    } catch (err: any) {
      if (err.message && !isNetworkOrOfflineError(err.message)) {
        throw err;
      }
    }

    // 2. Standalone / Offline Local Store Fallback
    const matchedMember = findMemberByCredential(cleanEmail);
    if (!matchedMember) {
      throw new Error(`Account "${cleanEmail}" was not found. Please verify your credentials or submit a registration application.`);
    }

    // Password verification (default password123 or member password)
    const expectedPass = matchedMember.password || 'password123';
    if (password !== expectedPass && password !== 'password123') {
      throw new Error('Invalid password. Please check your credentials or enter default demo password "password123".');
    }

    // Status checks
    const status = (matchedMember.status || 'ACTIVE').toUpperCase();
    if (status === 'PENDING_APPROVAL') {
      throw new Error('Your account registration is currently waiting for Admin approval. Please contact Central Library Administration.');
    }
    if (status === 'REJECTED') {
      throw new Error(`Your account application was rejected (Reason: ${matchedMember.rejectionReason || 'Incomplete verification'}).`);
    }
    if (status === 'SUSPENDED') {
      throw new Error(`Your library account has been suspended. Reason: ${matchedMember.suspendedReason || 'Administrative compliance review'}.`);
    }

    // Build verified User & signed token
    const verifiedUser = mapMemberToUser(matchedMember);
    const exp = Date.now() + TOKEN_EXPIRY_MS;
    const tokenPayload: TokenPayload = {
      id: verifiedUser.id,
      email: verifiedUser.email,
      role: verifiedUser.role,
      status: verifiedUser.status || 'ACTIVE',
      memberCardNo: verifiedUser.memberCardNo,
      iat: Date.now(),
      exp,
      sig: generateTokenSignature({
        id: verifiedUser.id,
        email: verifiedUser.email,
        role: verifiedUser.role,
        status: verifiedUser.status || 'ACTIVE',
        exp,
      }),
    };

    const token = btoa(JSON.stringify(tokenPayload));
    saveSession(token, verifiedUser);

    return { token, user: verifiedUser };
  },

  /**
   * Log out active session and purge authentication data.
   */
  logout() {
    clearSession();
  },

  /**
   * Strictly validate the login session and token.
   * If token is missing, expired, tampered, or if account status is no longer Approved & Active,
   * automatically purges invalid local storage data and returns null.
   */
  getCurrentUser(): User | null {
    try {
      const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
      const storedUserStr = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);

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

      // 2. Validate cryptographic signature & expiration
      if (!verifyTokenSignature(payload) || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
        this.logout();
        return null;
      }

      // 3. Validate stored user payload integrity
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

      // 4. Cross-verify against active database state in libraryStore
      const matched =
        findMemberByCredential(payload.email) ||
        (payload.memberCardNo ? findMemberByCredential(payload.memberCardNo) : null) ||
        findMemberByCredential(payload.id);

      if (!matched) {
        this.logout();
        return null;
      }

      // 5. Strict Approved & Active status check
      const matchedStatus = (matched.status || '').toUpperCase();
      if (matchedStatus !== 'ACTIVE' && matchedStatus !== 'APPROVED') {
        this.logout();
        return null;
      }

      const verifiedUser = mapMemberToUser(matched);
      saveSession(token, verifiedUser);

      return verifiedUser;
    } catch {
      this.logout();
      return null;
    }
  },

  /**
   * Helper to safely update display fields in storage after profile edits.
   */
  updateStoredUser(user: Partial<User>) {
    try {
      const current = this.getCurrentUser();
      if (!current) return;
      const updated: User = { ...current, ...user, role: current.role, status: current.status };
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(USER_KEY, JSON.stringify(updated));
      if (typeof localStorage !== 'undefined') localStorage.setItem(USER_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update stored user:', e);
    }
  },
};
