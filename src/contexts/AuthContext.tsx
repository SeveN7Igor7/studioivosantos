import React, { createContext, useContext, useState, ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; isAdmin: boolean }>;
  loginAsAdmin: (phone: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, phone: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  const loginAsAdmin = async (phone: string, password: string): Promise<boolean> => {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const adminRef = ref(db, `admin/${cleanPhone}`);
      const snapshot = await get(adminRef);

      if (snapshot.exists()) {
        const adminData = snapshot.val();
        if (adminData.senha === password) {
          const admin: User = {
            id: cleanPhone,
            name: adminData.nome,
            email: adminData.email || '',
            phone: cleanPhone,
            role: 'admin' as const,
          };

          setUser(admin);
          localStorage.setItem('user', JSON.stringify(admin));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Admin login error:', error);
      return false;
    }
  };

  const login = async (phone: string, password: string): Promise<{ success: boolean; isAdmin: boolean }> => {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      
      // First, check if it's an admin
      const adminRef = ref(db, `admin/${cleanPhone}`);
      const adminSnapshot = await get(adminRef);
      
      if (adminSnapshot.exists()) {
        const adminData = adminSnapshot.val();
        if (adminData.senha === password) {
          const admin: User = {
            id: cleanPhone,
            name: adminData.nome,
            email: adminData.email || '',
            phone: cleanPhone,
            role: 'admin' as const,
          };

          setUser(admin);
          localStorage.setItem('user', JSON.stringify(admin));
          return { success: true, isAdmin: true };
        }
      }

      // If not an admin, check regular users
      const userRef = ref(db, `user/number/${cleanPhone}`);
      const userSnapshot = await get(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        if (userData.senha === password) {
          const user: User = {
            id: cleanPhone,
            name: userData.nome,
            email: userData.email,
            phone: cleanPhone,
            role: 'user' as const,
          };

          setUser(user);
          localStorage.setItem('user', JSON.stringify(user));
          return { success: true, isAdmin: false };
        }
      }
      return { success: false, isAdmin: false };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, isAdmin: false };
    }
  };

  const register = async (name: string, email: string, password: string, phone: string): Promise<boolean> => {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      
      await set(ref(db, `user/number/${cleanPhone}`), {
        nome: name,
        email: email,
        senha: password,
        agendamento: {}
      });

      const user: User = {
        id: cleanPhone,
        name,
        email,
        phone: cleanPhone,
        role: 'user' as const,
      };

      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    isAuthenticated,
    isAdmin,
    login,
    loginAsAdmin,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
