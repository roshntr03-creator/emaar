
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Mail, Lock, AlertTriangle, Settings, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/ui/Modal';
import FirebaseConfigManager from '../components/settings/FirebaseConfigManager';
import { isFirebaseConfigured, uploadLocalDataToFirestore } from '../firebase/config';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';


const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const usingFirebase = isFirebaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setLoadingMessage('جاري التحقق...');
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('حدث خطأ ما. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  const handleConfigSaved = () => {
      setIsConfigModalOpen(false);
  };

  const handleCreateNewCompany = async () => {
    if (!window.confirm("تحذير: سيؤدي هذا إلى مسح جميع البيانات الحالية (سواء كانت محلية أو سحابية) والبدء من جديد ببيانات تجريبية. هل أنت متأكد؟")) {
      return;
    }
    setIsLoading(true);
    setError('');
    
    try {
      if (usingFirebase) {
        setLoadingMessage('جاري مسح البيانات السحابية الحالية...');
        await firebaseApi.clearAllFirestoreData();
        setLoadingMessage('جاري تعبئة النظام بالبيانات التجريبية...');
        await uploadLocalDataToFirestore(message => setLoadingMessage(`جاري التعبئة: ${message}`));
      } else {
        setLoadingMessage('جاري إعادة تعيين البيانات المحلية...');
        localApi.clearLocalDatabase();
      }
      alert("تم إنشاء حساب الشركة الجديد بنجاح! سيتم إعادة تحميل الصفحة الآن.");
      window.location.reload();
    } catch (err) {
      const errorMessage = "فشل في إعادة تعيين البيانات. يرجى التحقق من صلاحيات قاعدة البيانات في Firebase والمحاولة مرة أخرى.";
      setError(errorMessage);
      console.error(err);
      alert(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans p-4">
        {/* Main Login Box */}
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
                <Building size={40} className="mx-auto mb-3 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-800">نظام محاسبة المقاولات</h1>
                <p className="mt-1 text-gray-600">سجل الدخول للمتابعة إلى حسابك</p>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        البريد الإلكتروني
                    </label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        </span>
                        <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="email@example.com"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="password"className="block text-sm font-medium text-gray-700 mb-1">
                        كلمة المرور
                    </label>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="w-5 h-5 text-gray-400" />
                        </span>
                        <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                        />
                    </div>
                </div>
                {error && (
                <div className="flex items-start p-4 text-sm text-red-800 bg-red-50 rounded-lg border border-red-200" role="alert">
                    <AlertTriangle className="flex-shrink-0 w-5 h-5 ml-3" />
                    <div className="flex-1">
                        <p>{error}</p>
                    </div>
                </div>
                )}
                
                <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-all duration-200"
                >
                    {isLoading ? loadingMessage : 'تسجيل الدخول'}
                </button>
                </div>
            </form>
            
            <div className="mt-6 text-xs text-center text-gray-500 bg-gray-50 p-3 rounded-md border">
                <p className="font-bold mb-2">لأغراض العرض التوضيحي:</p>
                <ul className="space-y-1">
                <li><span className="font-semibold">المدير:</span> admin@company.com / <span className="font-mono">admin1</span></li>
                <li><span className="font-semibold">المحاسب:</span> accountant@company.com / <span className="font-mono">accountant</span></li>
                </ul>
            </div>
        </div>

        {/* Lower buttons */}
        <div className="w-full max-w-md mt-6 space-y-3">
             <button
                onClick={handleCreateNewCompany}
                disabled={isLoading}
                className="w-full flex justify-center items-center px-4 py-3 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:bg-gray-200 transition-all duration-200 shadow-sm"
            >
                <RefreshCw size={16} className="ml-2"/>
                {isLoading ? loadingMessage : 'إنشاء حساب شركة جديد (إعادة تعيين البيانات)'}
            </button>
            <button 
                onClick={() => setIsConfigModalOpen(true)} 
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white rounded-md hover:bg-gray-100 border border-gray-200 transition-colors shadow-sm"
            >
                <Settings size={16} />
                <span>إعدادات الاتصال السحابي ({usingFirebase ? "متصل" : "محلي"})</span>
            </button>
        </div>

        <Modal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} title="إعدادات الاتصال السحابي">
            <p className="text-sm text-gray-600 mb-4">
                هنا يمكنك إعداد الاتصال بقاعدة بيانات Firebase لمزامنة بياناتك. إذا تركت الحقول فارغة، سيعمل النظام في الوضع المحلي.
            </p>
            <FirebaseConfigManager onConfigSaved={handleConfigSaved} />
        </Modal>

        <div className="absolute bottom-4 text-xs text-gray-500">
            &copy; {new Date().getFullYear()} جميع الحقوق محفوظة.
        </div>
    </div>
  );
};

export default Login;
