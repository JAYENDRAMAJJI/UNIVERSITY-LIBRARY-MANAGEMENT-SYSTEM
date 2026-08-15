import { User, Role } from '../types';
import { libraryStore } from './libraryStore.service';

// Mock users for default fallback roles
const MOCK_USERS: User[] = [
  { id: '1', name: 'Chief Admin Librarian', email: 'admin@college.edu', role: 'ADMIN', department: 'Central University Library', memberCardNo: 'ADM-2020-0001' },
  { id: '2', name: 'Dr. Sarah Connor', email: 'faculty@college.edu', role: 'FACULTY', department: 'Computer Science & Engineering', memberCardNo: 'FAC-2023-1102' },
  { id: '3', name: 'Jayendra Majji', email: 'jayendramajji22@gmail.com', role: 'STUDENT', department: 'Computer Science & Engineering', memberCardNo: 'STU-2026-7326' },
];

export const authService = {
  async login(email: string, explicitRole?: Role): Promise<{ token: string; user: User }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const cleanEmail = email.trim().toLowerCase();

        // 1. Check if user is registered in libraryStore members
        const storeMembers = libraryStore.snapshot.members;
        const matchedMember = storeMembers.find((m) => m.email.toLowerCase() === cleanEmail);

        // Determine target role:
        let targetRole: Role;
        if (explicitRole) {
          targetRole = explicitRole;
        } else if (cleanEmail === 'faculty@college.edu' || cleanEmail.includes('faculty')) {
          targetRole = 'FACULTY';
        } else if (cleanEmail === 'admin@college.edu' || cleanEmail.includes('admin')) {
          targetRole = 'ADMIN';
        } else if (cleanEmail === 'student@college.edu' || cleanEmail.includes('student') || cleanEmail.includes('cutm') || cleanEmail.includes('jayendramajji')) {
          targetRole = 'STUDENT';
        } else if (cleanEmail.includes('staff')) {
          targetRole = 'STAFF';
        } else if (matchedMember) {
          targetRole = matchedMember.role;
        } else {
          targetRole = 'STUDENT';
        }

        let user: User;

        if (matchedMember) {
          user = {
            id: matchedMember.id,
            name: matchedMember.name,
            email: matchedMember.email,
            role: targetRole,
            department: matchedMember.department,
            avatarUrl: matchedMember.avatarUrl,
            phone: matchedMember.phone,
            memberCardNo: matchedMember.memberCardNo,
          };
          if (matchedMember.role !== targetRole) {
            libraryStore.updateMemberProfile(matchedMember.id, { role: targetRole });
          }
        } else {
          const mockUser = MOCK_USERS.find((u) => u.email.toLowerCase() === cleanEmail);
          if (mockUser) {
            user = { ...mockUser, role: targetRole };
          } else {
            user = {
              id: String(Date.now()),
              name: email.split('@')[0].toUpperCase(),
              email: email,
              role: targetRole,
            };

            libraryStore.registerMember({
              name: user.name,
              email: user.email,
              role: user.role,
            });
          }
        }

        const token = btoa(JSON.stringify({ id: user.id, role: user.role, email: user.email, exp: Date.now() + 86400000 }));
        sessionStorage.setItem('library_token', token);
        sessionStorage.setItem('library_user', JSON.stringify(user));
        resolve({ token, user });
      }, 300);
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
        const matched = storeMembers.find((m) => m.email.toLowerCase() === u.email.toLowerCase());

        let resolvedRole: Role = u.role;
        let resolvedName: string = u.name;
        let resolvedDept: string | undefined = u.department;
        let resolvedCardNo: string | undefined = u.memberCardNo;
        let resolvedAvatar: string | undefined = u.avatarUrl;

        if (matched) {
          resolvedRole = matched.role;
          resolvedName = matched.name;
          resolvedDept = matched.department;
          resolvedCardNo = matched.memberCardNo;
          resolvedAvatar = matched.avatarUrl;
        } else if (u.email.toLowerCase() === 'faculty@college.edu' || u.email.toLowerCase().includes('faculty')) {
          resolvedRole = 'FACULTY';
          resolvedName = 'Dr. Sarah Connor';
          resolvedDept = 'Computer Science & Engineering';
          resolvedCardNo = 'FAC-2023-1102';
        } else if (u.email.toLowerCase() === 'admin@college.edu' || u.email.toLowerCase().includes('admin')) {
          resolvedRole = 'ADMIN';
          resolvedName = 'Chief Admin Librarian';
          resolvedDept = 'Central University Library';
          resolvedCardNo = 'ADM-2020-0001';
        } else if (u.email.toLowerCase() === 'student@college.edu' || u.email.toLowerCase().includes('student') || u.email.toLowerCase().includes('cutm') || u.email.toLowerCase().includes('jayendramajji')) {
          resolvedRole = 'STUDENT';
          resolvedName = 'Jayendra Majji';
          resolvedDept = 'Computer Science & Engineering';
          resolvedCardNo = 'STU-2026-7326';
        }

        const updatedUser: User = {
          ...u,
          name: resolvedName,
          role: resolvedRole,
          department: resolvedDept || u.department || 'Computer Science & Engineering',
          memberCardNo: resolvedCardNo || u.memberCardNo || 'STU-2026-7326',
          avatarUrl: resolvedAvatar || u.avatarUrl,
        };
        sessionStorage.setItem('library_user', JSON.stringify(updatedUser));
        return updatedUser;
      } catch (e) {
        // Fallback
      }
    }

    if (token) {
      try {
        const payload = JSON.parse(atob(token));
        if (payload.exp >= Date.now()) {
          const storeMembers = libraryStore.snapshot.members;
          const matched = storeMembers.find((m) => m.email.toLowerCase() === payload.email?.toLowerCase());

          let resolvedRole: Role = payload.role || 'STUDENT';
          let resolvedName: string = 'Jayendra Majji';

          if (matched) {
            resolvedRole = matched.role;
            resolvedName = matched.name;
          } else if (payload.email?.toLowerCase() === 'faculty@college.edu' || payload.email?.toLowerCase().includes('faculty')) {
            resolvedRole = 'FACULTY';
            resolvedName = 'Dr. Sarah Connor';
          } else if (payload.email?.toLowerCase() === 'admin@college.edu' || payload.email?.toLowerCase().includes('admin')) {
            resolvedRole = 'ADMIN';
            resolvedName = 'Chief Admin Librarian';
          }

          return { id: payload.id || '3', name: resolvedName, email: payload.email || 'student@college.edu', role: resolvedRole };
        }
      } catch (e) {
        // Token invalid
      }
    }

    return null;
  },
};
