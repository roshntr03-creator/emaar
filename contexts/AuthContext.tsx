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
        if (!firebaseServices) return { success: false, message: "لم يتم تكوين Firebase بشكل صحيح. يرجى الذهاب إلى الإعدادات." };
        const { auth } = firebaseServices;
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            if (firebaseUser && firebaseUser.email) {
                // Check if user exists in our app's user collection
                const users = await api.getUsers();
                const appUser = users.find(u => u.email === firebaseUser.email);

                if (appUser) {
                    // Check if user is active
                    if (appUser.status === 'inactive') {
                        await signOut(auth);
                        return { success: false, message: 'هذا الحساب غير نشط. يرجى مراجعة المسؤول.' };
                    }
                    // User exists and is active, load permissions and set state.
                    await loadPermissionsAndSetUser(appUser);
                    return { success: true, message: "تم تسجيل الدخول بنجاح." };
                } else {
                    // User authenticated with Firebase but is not in our app's user database.
                    await signOut(auth); // Sign out immediately to prevent inconsistent state
                    return { success: false, message: `تم التحقق من المستخدم بنجاح، ولكن لا يوجد له حساب مسجل في التطبيق. يرجى التواصل مع المسؤول لإضافتك.` };
                }
            }
             // Fallback, should not be reached if signInWithEmailAndPassword is successful
            return { success: false, message: "حدث خطأ غير متوقع أثناء استرداد بيانات المستخدم." };

        } catch (error) {
            console.error("Firebase login error:", error);
            if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
                const firebaseError = error as { code: string, message: string };
                console.log(`Firebase Auth Error Detected. Code: [${firebaseError.code}]. Message: [${firebaseError.message}]`);
            }

            let message = "حدث خطأ غير متوقع أثناء تسجيل الدخول.";

            if (error && typeof error === 'object' && 'code' in error) {
                switch ((error as { code: string }).code) {
                    case 'auth/invalid-credential':
                        message = "فشل تسجيل الدخول: بيانات الاعتماد غير صالحة. الرجاء التحقق من البريد الإلكتروني وكلمة المرور. قد يكون السبب أيضاً خطأ في إعدادات Firebase API Key في صفحة الإعدادات أو أن موفر تسجيل الدخول بالبريد الإلكتروني غير مفعّل في مشروع Firebase الخاص بك.";
                        break;
                    case 'auth/user-disabled':
                        message = "تم تعطيل هذا الحساب. يرجى التواصل مع المسؤول.";
                        break;
                    case 'auth/network-request-failed':
                         message = "فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.";
                         break;
                    default:
                        message = "حدث خطأ غير متوقع. يرجى مراجعة إعدادات Firebase والمحاولة مرة أخرى.";
                }
            }
            return { success: false, message: message };
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
