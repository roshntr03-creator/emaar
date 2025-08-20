import React, { createContext, useState, useContext, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { signOut, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import type { User, RolePermissions, AllRolesPermissions, PermissionAction } from '../types';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured, initializeFirebase } from '../firebase/config';

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
  const [authInitialized, setAuthInitialized] = useState(false);
  
  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  const loadPermissionsAndSetUser = async (appUser: User) => {
      try {
          const allPermissions: AllRolesPermissions = await api.getPermissions();
          const userPermissions = allPermissions[appUser.role];
          setPermissions(userPermissions || {});
          setUser(appUser);
          localStorage.setItem('authUser', JSON.stringify(appUser));
      } catch (error) {
          console.error("Failed to load permissions", error);
          logout();
      }
  };

  const logout = () => {
    if (usingFirebase) {
        const firebaseServices = initializeFirebase();
        if (firebaseServices) {
            signOut(firebaseServices.auth);
        }
    }
    // Clear local state regardless
    setUser(null);
    setPermissions(null);
    localStorage.removeItem('authUser');
  };


  useEffect(() => {
    if (usingFirebase) {
        const firebaseServices = initializeFirebase();
        if (firebaseServices) {
            const auth = firebaseServices.auth;
            const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (firebaseUser && firebaseUser.email) {
                    const users = await api.getUsers();
                    const appUser = users.find(u => u.email === firebaseUser.email);
                    if (appUser) {
                        await loadPermissionsAndSetUser(appUser);
                    } else {
                        logout();
                    }
                } else {
                    setUser(null);
                    setPermissions(null);
                    localStorage.removeItem('authUser');
                }
                setAuthInitialized(true);
            });
            return () => unsubscribe();
        }
    } else {
        try {
            const savedUserJson = localStorage.getItem('authUser');
            if (savedUserJson) {
                const savedUser = JSON.parse(savedUserJson);
                loadPermissionsAndSetUser(savedUser);
            }
        } catch (error) {
            console.error("Failed to parse user from localStorage", error);
            localStorage.removeItem('authUser');
        }
        setAuthInitialized(true);
    }
  }, [usingFirebase]);


  const login = async (email: string, password: string): Promise<{ success: boolean, message: string }> => {
    if (usingFirebase) {
        const firebaseServices = initializeFirebase();
        if (!firebaseServices) return { success: false, message: "Firebase not configured correctly." };
        const auth = firebaseServices.auth;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true, message: "تم تسجيل الدخول بنجاح." };
        } catch (error) {
            console.error("Firebase login error:", error);
            return { success: false, message: "البريد الإلكتروني أو كلمة المرور غير صحيحة. تحقق من لوحة التحكم لمزيد من التفاصيل." };
        }
    } else {
        const users = await localApi.getUsers();
        const foundUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

        if (!foundUser) {
            return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
        }

        if (foundUser.status === 'inactive') {
            return { success: false, message: 'هذا الحساب غير نشط. يرجى مراجعة المسؤول.' };
        }

        // Insecure local login: Check against original seed passwords
        const seedPasswords: Record<string, string> = {
            'admin@company.com': 'admin',
            'accountant@company.com': 'accountant',
            'pm@company.com': 'project_manager',
            'viewer@company.com': 'viewer',
        };

        if (seedPasswords[foundUser.email] === password) {
            await loadPermissionsAndSetUser(foundUser);
            return { success: true, message: 'تم تسجيل الدخول بنجاح.' };
        }

        return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
    }
  };

  const hasPermission = (module: string, action: PermissionAction): boolean => {
    if (!user || !permissions) {
      return false;
    }
    if (user.role === 'admin') {
      return true;
    }
    const modulePermissions = permissions[module];
    if (!modulePermissions) {
      return false;
    }
    return modulePermissions[action] === true;
  };

  if (!authInitialized) {
      return (
        <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
      );
  }

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