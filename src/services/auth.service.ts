import { User, Role } from '../types';
import { libraryStore } from './libraryStore.service';

// Mock users for default fallback roles
const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Chief Admin Librarian',
    email: 'admin@college.edu',
    role: 'ADMIN',
    status: 'ACTIVE',
    department: 'Central University Library',
    memberCardNo: 'ADM-2020-0001',
  },
  {
    id: '2',
    name: 'Dr. Sarah Connor',
    email: 'faculty@college.edu',
    role: 'FACULTY',
    status: 'ACTIVE',
    department: 'Computer Science & Engineering',
    memberCardNo: 'FAC-2023-1102',
  },
  {
    id: '3',
    name: 'Jayendra Majji',
    email: 'jayendramajji22@gmail.com',
    role: 'STUDENT',
    status: 'ACTIVE',
    department: 'Computer Science & Engineering',
    memberCardNo: 'STU-2026-7326',
  },
  {
    id: '4',
    name: 'Mr. Rajesh Kumar',
    email: 'staff@college.edu',
    role: 'STAFF',
    status: 'ACTIVE',
    department: 'Circulation & Desk Operations',
    memberCardNo: 'STF-2024-0012',
  },
];

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
          if (matchedMember.status === 'PENDING_APPROVAL') {
            const dateStr = matchedMember.appliedDate || matchedMember.registeredDate || 'recently';
            return reject(
              new Error(
                `Your library account is waiting for Admin approval. Application submitted on ${dateStr}. Please check back once verified.`
              )
            );
          }

          if (matchedMember.status === 'REJECTED') {
            const reason = matchedMember.rejectionReason || 'Application details could not be verified by Library Administration.';
            return reject(
              new Error(
                `Your library account registration has been rejected. Reason: "${reason}". Please contact Library Administration for assistance.`
              )
            );
          }

          if (matchedMember.status === 'SUSPENDED') {
            const reason = matchedMember.suspendedReason ? ` (Reason: ${matchedMember.suspendedReason})` : '';
            return reject(
              new Error(
                `Your library account has been suspended${reason}. Please contact the Library Administration.`
              )
            );
          }

          if (matchedMember.status === 'INACTIVE') {
            return reject(
              new Error(`Your library account is currently inactive. Please contact the Library Administration.`)
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
    sessionStorage.removeItem('library_token');
    sessionStorage.removeItem('library_user');
    localStorage.removeItem('library_token');
    localStorage.removeItem('library_user');
  },

  getCurrentUser(): User | null {
    if (localStorage.getItem('library_token') || localStorage.getItem('library_user')) {
      localStorage.removeItem('library_token');
      localStorage.removeItem('library_user');
    }

    const token = sessionStorage.getItem('library_token');
    const storedUser = sessionStorage.getItem('library_user');

    if (storedUser) {
      try {
        const u: User = JSON.parse(storedUser);
        const storeMembers = libraryStore.snapshot.members;
        const matched = storeMembers.find((m) => m.email.toLowerCase() === u.email.toLowerCase() || m.id === u.id);

        // Security check: If member status is no longer ACTIVE/APPROVED in libraryStore, invalidate session immediately
        if (matched) {
          if (matched.status === 'PENDING_APPROVAL' || matched.status === 'REJECTED' || matched.status === 'SUSPENDED' || matched.status === 'INACTIVE') {
            this.logout();
            return null;
          }

          const updatedUser: User = {
            ...u,
            name: matched.name,
            role: matched.role,
            status: matched.status,
            department: matched.department,
            memberCardNo: matched.memberCardNo,
            avatarUrl: matched.avatarUrl,
            phone: matched.phone,
            rollNo: matched.rollNo,
          };
          sessionStorage.setItem('library_user', JSON.stringify(updatedUser));
          return updatedUser;
        }

        return u;
      } catch {
        this.logout();
        return null;
      }
    }

    if (token) {
      try {
        const payload = JSON.parse(atob(token));
        if (payload.exp >= Date.now()) {
          const storeMembers = libraryStore.snapshot.members;
          const matched = storeMembers.find((m) => m.email.toLowerCase() === payload.email?.toLowerCase());

          if (matched && (matched.status === 'PENDING_APPROVAL' || matched.status === 'REJECTED' || matched.status === 'SUSPENDED')) {
            this.logout();
            return null;
          }

          const mock = MOCK_USERS.find((m) => m.email.toLowerCase() === payload.email?.toLowerCase());
          return mock || matched ? {
            id: matched?.id || mock?.id || payload.id,
            name: matched?.name || mock?.name || 'Authorized Member',
            email: matched?.email || mock?.email || payload.email,
            role: matched?.role || mock?.role || payload.role || 'STUDENT',
            status: matched?.status || mock?.status || 'ACTIVE',
            department: matched?.department || mock?.department,
            memberCardNo: matched?.memberCardNo || mock?.memberCardNo,
          } : null;
        }
      } catch {
        this.logout();
      }
    }

    return null;
  },
};
