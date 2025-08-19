import React, { createContext, useState, useContext, useEffect } from 'react';
import type { User, RolePermissions, AllRolesPermissions, PermissionAction } from '../types';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  permissions: RolePermissions | null;
  hasPermission: (module: string, action: PermissionAction) => boolean;
  login: (email: string, password: string) => Promise<{ success: boolean, message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  const loadUserAndPermissions = async (loggedInUser: User) => {
    try {
      const allPermissions: AllRolesPermissions = await api.getPermissions();
      const userPermissions = allPermissions[loggedInUser.role];
      setPermissions(userPermissions || {});
      setUser(loggedInUser);
    } catch (error) {
        console.error("Failed to load permissions", error);
        // Log out user if permissions can't be loaded, to be safe
        logout();
    }
  };

  useEffect(() => {
    try {
      const savedUserJson = localStorage.getItem('authUser');
      if (savedUserJson) {
        const savedUser = JSON.parse(savedUserJson);
        loadUserAndPermissions(savedUser);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('authUser');
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean, message: string }> => {
    // Note: The local user database is still the source of truth for login credentials
    // even in Firebase mode, unless a full Firebase Auth system is implemented.
    const users = await localApi.getUsers(); 
    const foundUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!foundUser) {
        return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
    }

    if (foundUser.status === 'inactive') {
        return { success: false, message: 'هذا الحساب غير نشط. يرجى مراجعة المسؤول.' };
    }
    
    if (password === foundUser.password) {
      await loadUserAndPermissions(foundUser);
      localStorage.setItem('authUser', JSON.stringify(foundUser));
      return { success: true, message: 'تم تسجيل الدخول بنجاح.' };
    }
    
    return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
  };

  const logout = () => {
    setUser(null);
    setPermissions(null);
    localStorage.removeItem('authUser');
  };

  const hasPermission = (module: string, action: PermissionAction): boolean => {
    if (!user || !permissions) {
      return false;
    }
    // Admin has all permissions implicitly
    if (user.role === 'admin') {
      return true;
    }
    const modulePermissions = permissions[module];
    if (!modulePermissions) {
      return false;
    }
    return modulePermissions[action] === true;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, permissions, hasPermission, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};