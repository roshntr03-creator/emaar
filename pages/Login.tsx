
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Mail, Lock, AlertTriangle, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/ui/Modal';
import FirebaseConfigManager from '../components/settings/FirebaseConfigManager';
import { isFirebaseConfigured } from '../firebase/config';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const usingFirebase = isFirebaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
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
    }
  };
  
  const handleConfigSaved = () => {
      setIsConfigModalOpen(false);
      window.location.reload();
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-4xl flex-row-reverse lg:flex-row flex bg-white rounded-xl shadow-2xl overflow-hidden relative">
        {/* Config button for mobile */}
        <button 
          onClick={() => setIsConfigModalOpen(true)}
          className="lg:hidden absolute top-4 left-4 p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 z-10"
          aria-label="إعدادات الاتصال"
        >
          <Settings size={20} />
        </button>

        {/* Form Section */}
        <div className="w-full lg:w-1/2 p-8 md:p-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">أهلاً بك مجدداً!</h2>
          <p className="text-gray-600 mb-8">سجل الدخول للمتابعة إلى نظامك المحاسبي.</p>
          
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
                {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </button>
            </div>
          </form>

           <div className="mt-6 text-xs text-center text-gray-500 bg-gray-50 p-3 rounded-md border">
            <p className="font-bold mb-2">لأغراض العرض التوضيحي:</p>
            <ul className="space-y-1">
              <li><span className="font-semibold">المدير:</span> admin@company.com / <span className="font-mono">admin</span></li>
              <li><span className="font-semibold">المحاسب:</span> accountant@company.com / <span className="font-mono">accountant</span></li>
            </ul>
          </div>
        </div>

        {/* Branding Section */}
        <div className="hidden lg:flex w-1/2 bg-blue-600 p-12 flex-col justify-between items-center text-white">
            <div className="text-center">
                <Building size={48} className="mx-auto mb-4" />
                <h1 className="text-3xl font-bold">نظام محاسبة المقاولات</h1>
                <p className="mt-2 opacity-80">إدارة متكاملة لمشاريعك وأموالك بكفاءة ودقة.</p>
            </div>
            <div className="text-center">
                <button 
                  onClick={() => setIsConfigModalOpen(true)} 
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <Settings size={16} />
                  <span>إعدادات الاتصال السحابي</span>
                </button>
                 <p className="text-xs mt-3 opacity-80">
                  {usingFirebase ? "الوضع الحالي: متصل بالسحابة" : "الوضع الحالي: محلي"}
                </p>
            </div>
            <div className="text-xs opacity-70">
                &copy; {new Date().getFullYear()} جميع الحقوق محفوظة.
            </div>
        </div>
      </div>

      <Modal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} title="إعدادات الاتصال السحابي">
        <p className="text-sm text-gray-600 mb-4">
            هنا يمكنك إعداد الاتصال بقاعدة بيانات Firebase لمزامنة بياناتك. إذا تركت الحقول فارغة، سيعمل النظام في الوضع المحلي.
        </p>
        <FirebaseConfigManager onConfigSaved={handleConfigSaved} />
      </Modal>

    </div>
  );
};

export default Login;
