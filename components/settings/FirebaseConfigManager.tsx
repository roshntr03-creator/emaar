import React, { useState } from 'react';
import { Cloud, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import firebase from 'firebase/compat/app';
import { getFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from '../../firebase/config';
import type { FirebaseConfig } from '../../types';

interface FirebaseConfigManagerProps {
  onConfigSaved?: () => void;
}

const FirebaseConfigManager: React.FC<FirebaseConfigManagerProps> = ({ onConfigSaved }) => {
    const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(getFirebaseConfig());
    const [configInputs, setConfigInputs] = useState<FirebaseConfig>(firebaseConfig || { apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' });
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
    const [testMessage, setTestMessage] = useState('');

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setConfigInputs(prev => ({ ...prev, [name]: value }));
        setTestStatus('idle'); // Reset test status on change
    };

    const handleSaveConfig = () => {
        saveFirebaseConfig(configInputs);
        setFirebaseConfig(configInputs);
        alert('تم حفظ إعدادات Firebase. سيتم الآن إعادة تحميل الصفحة لتطبيق التغييرات.');
        if (onConfigSaved) {
            onConfigSaved();
        }
    };

    const handleClearConfig = () => {
        if(window.confirm('هل أنت متأكد من حذف إعدادات الاتصال بالسحابة؟ سيعود التطبيق للعمل بالوضع المحلي.')) {
            clearFirebaseConfig();
            setFirebaseConfig(null);
            setConfigInputs({ apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' });
            alert('تم حذف إعدادات Firebase. سيتم الآن إعادة تحميل الصفحة.');
             if (onConfigSaved) {
                onConfigSaved();
            }
        }
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('');
        try {
            // Attempt to initialize a temporary app to validate config
            // Using a unique name avoids conflicts with the main app instance
            firebase.initializeApp(configInputs, `config_test_${Date.now()}`);
            setTestStatus('success');
            setTestMessage('تم الاتصال بنجاح!');
        } catch (error) {
            setTestStatus('fail');
            setTestMessage('فشل الاتصال. تحقق من بياناتك.');
            console.error("Firebase test init failed:", error);
        }
        setTimeout(() => setTestStatus('idle'), 5000);
    };
    
    return (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-2">
            <h4 className="font-semibold text-md text-gray-700 flex items-center"><Cloud size={18} className="ml-2" /> إعدادات الاتصال السحابي (Firebase)</h4>
            {Object.keys(configInputs).map(key => (
                <div key={key}>
                    <label htmlFor={key} className="block text-xs font-medium text-gray-600">{key}</label>
                    <input type="text" id={key} name={key} value={configInputs[key as keyof FirebaseConfig]} onChange={handleConfigChange} className="w-full text-sm mt-1 px-2 py-1 border border-gray-300 rounded-md shadow-sm font-mono" />
                </div>
            ))}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button onClick={handleSaveConfig} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">حفظ الإعدادات</button>
                <button onClick={handleTestConnection} disabled={testStatus === 'testing'} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50 flex justify-center items-center">
                    {testStatus === 'testing' && <Loader2 size={16} className="animate-spin ml-2" />}
                    {testStatus === 'success' && <CheckCircle size={16} className="text-green-500 ml-2" />}
                    {testStatus === 'fail' && <AlertTriangle size={16} className="text-red-500 ml-2" />}
                    {testStatus === 'idle' ? 'اختبار الاتصال' : testMessage}
                </button>
                {firebaseConfig && <button onClick={handleClearConfig} className="flex-1 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200">حذف الإعدادات</button>}
            </div>
        </div>
    );
};

export default FirebaseConfigManager;
