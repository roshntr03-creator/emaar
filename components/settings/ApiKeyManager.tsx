
import React, { useState } from 'react';
import { KeyRound, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApiKey } from '../../contexts/ApiKeyContext';

const ApiKeyManager: React.FC = () => {
    const { apiKey, saveApiKey, removeApiKey } = useApiKey();
    const [newApiKey, setNewApiKey] = useState('');
    const [message, setMessage] = useState('');

    const handleSave = () => {
        if (newApiKey.trim()) {
            saveApiKey(newApiKey.trim());
            setNewApiKey('');
            setMessage('تم حفظ مفتاح API بنجاح.');
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    const handleRemove = () => {
        if (window.confirm('هل أنت متأكد من إزالة مفتاح API؟')) {
            removeApiKey();
            setMessage('تمت إزالة مفتاح API.');
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    const getMaskedKey = (key: string | null): string => {
        if (!key) return 'غير متوفر';
        if (key.length < 8) return '****';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-800">إدارة مفتاح Google AI API</h3>
                <p className="mt-1 text-sm text-gray-600">
                    مفتاح API الخاص بك ضروري لتفعيل الميزات المدعومة بالذكاء الاصطناعي مثل الملخص التنفيذي وتحليل الأخطاء. يتم تخزين مفتاحك بشكل آمن في المتصفح الخاص بك فقط.
                </p>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    احصل على مفتاح API من Google AI Studio
                </a>
            </div>

            <div className="p-4 border rounded-lg space-y-4 bg-gray-50">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">المفتاح الحالي:</span>
                    {apiKey ? (
                         <span className="flex items-center font-mono text-sm px-2 py-1 bg-green-100 text-green-800 rounded-md">
                            <CheckCircle size={14} className="ml-2" />
                            {getMaskedKey(apiKey)}
                        </span>
                    ) : (
                        <span className="flex items-center font-mono text-sm px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md">
                            <AlertTriangle size={14} className="ml-2" />
                            لم يتم الإعداد
                        </span>
                    )}
                </div>
                 {apiKey && (
                    <button 
                        onClick={handleRemove}
                        className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        إزالة المفتاح
                    </button>
                )}
            </div>

            <div className="space-y-2">
                <label htmlFor="apiKeyInput" className="block text-sm font-medium text-gray-700">
                    {apiKey ? 'تحديث مفتاح API' : 'إضافة مفتاح API'}
                </label>
                <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                        id="apiKeyInput"
                        type="password"
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        placeholder="أدخل مفتاح API هنا"
                        className="flex-grow w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                        onClick={handleSave}
                        disabled={!newApiKey.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        حفظ
                    </button>
                </div>
                {message && <p className="text-sm text-green-600 mt-2">{message}</p>}
            </div>
        </div>
    );
};

export default ApiKeyManager;
