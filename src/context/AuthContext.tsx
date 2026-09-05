import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Role, User } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password?: string, role?: Role) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on initial load
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password?: string, role?: Role) => {
    // Support legacy calls login(email, role) where 2nd param is Role
    let pass: string | undefined = password;
    let r: Role | undefined = role;
    if (password && ['ADMIN', 'LIBRARIAN', 'FACULTY', 'STUDENT', 'STAFF', 'GUEST', 'OTHER'].includes(password)) {
      r = password as Role;
      pass = undefined;
    }

    const { user } = await authService.login(email, pass, r);
    setUser(user);
    return user;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
