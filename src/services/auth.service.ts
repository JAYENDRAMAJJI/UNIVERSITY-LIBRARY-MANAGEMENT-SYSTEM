import { User, Role } from '../types';
import { libraryStore } from './libraryStore.service';

// Mock users for default fallback roles
const MOCK_USERS: User[] = [
  { id: '1', name: 'Chief Admin Librarian', email: 'admin@college.edu', role: 'ADMIN' },
  { id: '2', name: 'Dr. Sarah Connor', email: 'faculty@college.edu', role: 'FACULTY' },
  { id: '3', name: 'Jayendra Majji', email: 'jayendramajji22@gmail.com', role: 'STUDENT' },
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
        // Priority: 1. explicitRole -> 2. Email pattern match -> 3. matchedMember.role -> 4. Default 'STUDENT'
        let targetRole: Role;
        if (explicitRole) {
          targetRole = explicitRole;
        } else if (cleanEmail === 'faculty@college.edu' || cleanEmail.includes('faculty')) {
          targetRole = 'FACULTY';
        } else if (cleanEmail === 'admin@college.edu' || cleanEmail.includes('admin')) {
          targetRole = 'ADMIN';
        } else if (cleanEmail === 'student@college.edu' || cleanEmail.includes('student')) {
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
          };
          // Keep member role synced in store
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
    // Clear any legacy persistent auth items from localStorage if present
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
        let resolvedName: string = u.name === 'Alex Johnson' ? 'Jayendra Majji' : u.name;

        if (matched) {
          resolvedRole = matched.role;
          resolvedName = matched.name;
        } else if (u.email.toLowerCase() === 'faculty@college.edu' || u.email.toLowerCase().includes('faculty')) {
          resolvedRole = 'FACULTY';
          resolvedName = 'Dr. Sarah Connor';
        } else if (u.email.toLowerCase() === 'admin@college.edu' || u.email.toLowerCase().includes('admin')) {
          resolvedRole = 'ADMIN';
          resolvedName = 'Chief Admin Librarian';
        } else if (u.email.toLowerCase() === 'student@college.edu' || u.email.toLowerCase().includes('student')) {
          resolvedRole = 'STUDENT';
          resolvedName = 'Jayendra Majji';
        }

        const updatedUser: User = { ...u, name: resolvedName, role: resolvedRole };
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
