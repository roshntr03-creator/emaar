

import React, { useState, useEffect, useCallback } from 'react';
import { Building, Settings as SettingsIcon, Banknote, Bell, Shield, KeyRound, Loader2, Database, Download, AlertTriangle, Cloud, UploadCloud } from 'lucide-react';
import type { User, AllRolesPermissions, SettingsData, PermissionAction, ModulePermissions, FirebaseConfig } from '../types';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured, uploadLocalDataToFirestore } from '../firebase/config';
import ApiKeyManager from '../components/settings/ApiKeyManager';
import FirebaseConfigManager from '../components/settings/FirebaseConfigManager';


// --- Component Configuration ---
const settingsTabs = [
  { id: 'company', label: 'بيانات الشركة', icon: Building },
  { id: 'general', label: 'إعدادات عامة', icon: SettingsIcon },
  { id: 'financial', label: 'إعدادات مالية', icon: Banknote },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'roles', label: 'الأدوار والصلاحيات', icon: Shield },
  { id: 'data', label: 'البيانات', icon: Database },
  { id: 'apiKeys', label: 'مفاتيح API', icon: KeyRound },
];

const roleMap: Record<User['role'], string> = {
  admin: 'مدير',
  accountant: 'محاسب',
  project_manager: 'مدير مشروع',
  viewer: 'مُشاهد'
};

const permissionConfig: { [module: string]: { label: string; actions: { key: PermissionAction, label: string }[] } } = {
    clients: { label: 'العملاء', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    suppliers: { label: 'الموردون', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    projects: { label: 'المشاريع', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    subcontracts: { label: 'عقود الباطن', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    assets: { label: 'إدارة الأصول', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    documents: { label: 'مستودع المستندات', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    chartOfAccounts: { label: 'دليل الحسابات', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    purchaseOrders: { label: 'أوامر الشراء', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    invoices: { label: 'فواتير العملاء', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    supplierBills: { label: 'فواتير الموردين', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    inventory: { label: 'المخزون', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    journalVouchers: { label: 'القيود اليومية', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    reports: { label: 'التقارير', actions: [{key: 'view', label: 'عرض'}] },
    employees: { label: 'الموظفون', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    users: { label: 'المستخدمون', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    payroll: { label: 'الرواتب', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    changeOrders: { label: 'أوامر التغيير', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    custody: { label: 'العهدة', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    vouchers: { label: 'السندات', actions: [{key: 'view', label: 'عرض'}, {key: 'create', label: 'إنشاء'}, {key: 'edit', label: 'تعديل'}, {key: 'delete', label: 'حذف'}] },
    diagnostics: { label: 'التشخيص', actions: [{key: 'view', label: 'عرض'}] },
    settings: { label: 'الإعدادات', actions: [{key: 'view', label: 'عرض'}, {key: 'edit', label: 'تعديل'}] },
};

const DataManagementTab: React.FC = () => {
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [syncMessage, setSyncMessage] = useState('');

    const handleSync = async () => {
        if (!isFirebaseConfigured()) {
            setSyncStatus('error');
            setSyncMessage('الرجاء إعداد وحفظ معلومات الاتصال بـ Firebase أولاً.');
            return;
        }
        if (!window.confirm("تحذير: سيتم رفع جميع البيانات المحلية إلى السحابة. قد يؤدي هذا إلى استبدال البيانات الموجودة في السحابة. هل تريد المتابعة؟")) {
            return;
        }

        setSyncStatus('syncing');
        setSyncMessage('جاري المزامنة...');
        try {
            const result = await uploadLocalDataToFirestore((message) => setSyncMessage(message));
            if (result.success) {
                setSyncStatus('success');
                setSyncMessage('تمت مزامنة جميع البيانات بنجاح!');
            } else {
                setSyncStatus('error');
                setSyncMessage(`فشلت المزامنة: ${result.message}`);
            }
        } catch (error) {
            setSyncStatus('error');
            setSyncMessage(`حدث خطأ فادح: ${error instanceof Error ? error.message : String(error)}`);
        }
    };


    const handleExport = () => {
        const jsonData = localApi.exportAllData();
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `accounting_system_backup_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm("تحذير: سيؤدي استيراد البيانات إلى استبدال جميع البيانات المحلية الحالية في النظام. هل أنت متأكد أنك تريد المتابعة؟ لا يمكن التراجع عن هذا الإجراء.")) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                const result = localApi.importData(jsonString);
                if (result.success) {
                    alert('تم استيراد البيانات بنجاح. سيتم إعادة تحميل التطبيق الآن.');
                    window.location.reload();
                } else {
                    alert(`خطأ في الاستيراد: ${result.message}`);
                }
            } catch (error) {
                alert('حدث خطأ غير متوقع أثناء معالجة الملف.');
                console.error(error);
            } finally {
                event.target.value = '';
            }
        };
        reader.onerror = () => {
             alert('فشل في قراءة الملف.');
             event.target.value = '';
        }
        reader.readAsText(file);
    };

    return (
        <div className="space-y-8">
             {/* --- Firebase Sync --- */}
            <div className="border-b pb-8">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center"><Cloud size={20} className="ml-2"/>الاتصال السحابي (Firebase)</h3>
                <p className="mt-1 text-sm text-gray-600">
                    اربط البرنامج بقاعدة بيانات Firebase Firestore للاحتفاظ بنسخة احتياطية من بياناتك ومزامنتها عبر الأجهزة.
                </p>

                <div className="mt-4">
                   <FirebaseConfigManager onConfigSaved={() => {}} />
                </div>
                
                <div className="mt-4">
                     <h4 className="font-semibold text-md text-gray-700">المزامنة السحابية</h4>
                     <p className="text-xs text-gray-500 mb-2">رفع البيانات المحلية الحالية إلى قاعدة بيانات Firebase.</p>
                     <button onClick={handleSync} disabled={syncStatus === 'syncing' || !isFirebaseConfigured()} className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
                        {syncStatus === 'syncing' ? <Loader2 className="animate-spin" /> : <UploadCloud size={16} className="ml-2" />}
                        بدء المزامنة الآن
                     </button>
                     {syncMessage && <p className="text-sm mt-2 text-center">{syncMessage}</p>}
                </div>

            </div>

            {/* --- Local Data Management --- */}
             <div>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center"><Database size={20} className="ml-2"/>إدارة البيانات المحلية</h3>
                <p className="mt-1 text-sm text-gray-600">
                    تصدير نسخة احتياطية من جميع بياناتك المحلية، أو استيراد بيانات من نسخة سابقة.
                </p>
                <div className="mt-4 flex gap-4">
                    <button onClick={handleExport} className="w-1/2 flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800">
                        <Download size={16} className="ml-2"/>
                        تصدير البيانات (JSON)
                    </button>
                    <label className="w-1/2 flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800 cursor-pointer">
                        <UploadCloud size={16} className="ml-2"/>
                        استيراد البيانات (JSON)
                        <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                    </label>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 flex items-start">
                    <AlertTriangle size={20} className="ml-3 mt-1 flex-shrink-0"/>
                    <div>
                        <h4 className="font-bold">تحذير</h4>
                        <p className="text-xs">
                           استيراد البيانات سيقوم بحذف واستبدال جميع البيانات الحالية في التطبيق. يرجى التأكد من وجود نسخة احتياطية قبل المتابعة.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SettingsFormTab: React.FC<{
    title: string;
    description: string;
    children: (formData: SettingsData, handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void) => React.ReactNode;
}> = ({ title, description, children }) => {
    const usingFirebase = isFirebaseConfigured();
    const api = usingFirebase ? firebaseApi : localApi;
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [originalSettings, setOriginalSettings] = useState<SettingsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings);

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const data = await api.getSettings();
                setSettings(data);
                setOriginalSettings(JSON.parse(JSON.stringify(data)));
            } catch (error) {
                console.error("Failed to fetch settings", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [api]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        let processedValue: string | boolean = value;
        if (type === 'checkbox') {
             processedValue = (e.target as HTMLInputElement).checked;
        }

        setSettings(prev => prev ? { ...prev, [name]: processedValue } : null);
    };

    const handleSave = async () => {
        if (!settings) return;
        try {
            await api.updateSettings(settings);
            setOriginalSettings(JSON.parse(JSON.stringify(settings)));
            alert("تم حفظ الإعدادات بنجاح.");
        } catch (error) {
            console.error("Failed to save settings", error);
            alert("فشل حفظ الإعدادات.");
        }
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin" /></div>;
    }

    if (!settings) {
        return <div>فشل تحميل الإعدادات.</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                <p className="mt-1 text-sm text-gray-600">{description}</p>
            </div>
            <div className="space-y-4 border-t pt-6">
                {children(settings, handleChange)}
            </div>
             <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={!isDirty}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                    حفظ التغييرات
                </button>
            </div>
        </div>
    );
};

const RolesPermissionsTab: React.FC = () => {
    const usingFirebase = isFirebaseConfigured();
    const api = usingFirebase ? firebaseApi : localApi;
    const [permissions, setPermissions] = useState<AllRolesPermissions | null>(null);
    const [originalPermissions, setOriginalPermissions] = useState<AllRolesPermissions | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<User['role']>('accountant');

    const isDirty = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);

    useEffect(() => {
        const fetchPermissions = async () => {
            setIsLoading(true);
            try {
                const data = await api.getPermissions();
                setPermissions(data);
                setOriginalPermissions(JSON.parse(JSON.stringify(data)));
            } catch (error) {
                console.error("Failed to fetch permissions", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPermissions();
    }, [api]);

    const handleTogglePermission = (role: User['role'], module: string, action: PermissionAction) => {
        if (role === 'admin' || !permissions) return;
        
        const newPermissions = JSON.parse(JSON.stringify(permissions));
        
        if (!newPermissions[role][module]) {
            newPermissions[role][module] = {};
        }

        const currentPermission = newPermissions[role][module][action];
        newPermissions[role][module][action] = !currentPermission;
        
        setPermissions(newPermissions);
    };

    const handleSaveChanges = async () => {
        if (!permissions) return;
        try {
            await api.updatePermissions(permissions);
            setOriginalPermissions(JSON.parse(JSON.stringify(permissions)));
            alert('تم حفظ الصلاحيات بنجاح.');
        } catch (error) {
            console.error("Failed to save permissions", error);
            alert('فشل حفظ الصلاحيات.');
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin" /></div>;
    }
    
    if (!permissions) {
        return <div>فشل تحميل بيانات الصلاحيات.</div>;
    }

    const currentRolePermissions = permissions[selectedRole];
    const actionKeys = ['view', 'create', 'edit', 'delete'] as PermissionAction[];
    const actionLabels = {'view': 'عرض', 'create': 'إنشاء', 'edit': 'تعديل', 'delete': 'حذف'};


    return (
        <div className="flex flex-col md:flex-row gap-6">
            <nav className="md:w-1/4 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible md:space-y-1 space-x-1 space-x-reverse md:space-x-0">
                {Object.entries(roleMap).map(([key, value]) => (
                    <button
                        key={key}
                        onClick={() => setSelectedRole(key as User['role'])}
                        className={`flex-shrink-0 px-4 py-2 text-right rounded-md text-sm ${selectedRole === key ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}
                    >
                        {value}
                    </button>
                ))}
            </nav>
            <div className="md:w-3/4">
                <div className="border rounded-lg p-4 bg-white">
                    <h3 className="text-lg font-bold mb-4">صلاحيات دور: {roleMap[selectedRole]}</h3>
                    {selectedRole === 'admin' && <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">دور المدير يمتلك جميع الصلاحيات بشكل دائم ولا يمكن تعديله.</p>}

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-right text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="py-2 px-3 font-semibold text-gray-600">الوحدة</th>
                                    {actionKeys.map(key => (
                                        <th key={key} className="py-2 px-3 font-semibold text-gray-600 text-center">{actionLabels[key]}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(permissionConfig).map(([moduleKey, moduleConfig]) => (
                                    <tr key={moduleKey} className="border-t">
                                        <td className="py-2 px-3 font-medium">{moduleConfig.label}</td>
                                        {actionKeys.map(action => {
                                            const isActionAvailable = moduleConfig.actions.some(a => a.key === action);
                                            const isChecked = selectedRole === 'admin' || (currentRolePermissions?.[moduleKey]?.[action] ?? false);
                                            
                                            return (
                                                <td key={action} className="py-2 px-3 text-center">
                                                    {isActionAvailable ? (
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            checked={isChecked}
                                                            disabled={selectedRole === 'admin'}
                                                            onChange={() => handleTogglePermission(selectedRole, moduleKey, action)}
                                                        />
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {selectedRole !== 'admin' && (
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSaveChanges}
                            disabled={!isDirty}
                            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            حفظ التغييرات
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('company');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'company':
                 return <SettingsFormTab title="بيانات الشركة" description="إدارة معلومات شركتك الأساسية التي تظهر في التقارير والفواتير.">
                    {(settings, handleChange) => (
                        <>
                            <div>
                                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">اسم الشركة</label>
                                <input type="text" name="companyName" id="companyName" value={settings.companyName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                            </div>
                            <div>
                                <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">عنوان الشركة</label>
                                <textarea name="companyAddress" id="companyAddress" value={settings.companyAddress} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"></textarea>
                            </div>
                            <div>
                                <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700">الرقم الضريبي</label>
                                <input type="text" name="vatNumber" id="vatNumber" value={settings.vatNumber} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                            </div>
                        </>
                    )}
                </SettingsFormTab>;
            case 'general':
                 return <SettingsFormTab title="إعدادات عامة" description="تخصيص الإعدادات العامة للتطبيق مثل اللغة والمظهر.">
                    {(settings, handleChange) => (
                         <>
                            <div>
                                <label htmlFor="language" className="block text-sm font-medium text-gray-700">لغة الواجهة</label>
                                <select name="language" id="language" value={settings.language} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white">
                                    <option value="ar">العربية</option>
                                    <option value="en" disabled>English (قيد التطوير)</option>
                                </select>
                            </div>
                             <div>
                                <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700">صيغة التاريخ</label>
                                <select name="dateFormat" id="dateFormat" value={settings.dateFormat} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white">
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                     <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                </select>
                            </div>
                         </>
                    )}
                </SettingsFormTab>;
            case 'financial':
                 return <SettingsFormTab title="إعدادات مالية" description="إدارة الإعدادات المتعلقة بالعمليات المالية والمحاسبية.">
                    {(settings, handleChange) => (
                         <>
                             <div>
                                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">العملة</label>
                                <input type="text" name="currency" id="currency" value={settings.currency} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                            </div>
                            <div>
                                <label htmlFor="invoicePrefix" className="block text-sm font-medium text-gray-700">بادئة الفواتير</label>
                                <input type="text" name="invoicePrefix" id="invoicePrefix" value={settings.invoicePrefix} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                            </div>
                         </>
                    )}
                </SettingsFormTab>;
            case 'notifications':
                 return <SettingsFormTab title="الإشعارات والتنبيهات" description="تحكم في التنبيهات التي ترغب في استقبالها من النظام.">
                    {(settings, handleChange) => (
                        <div className="space-y-4">
                           <div className="relative flex items-start">
                                <div className="flex items-center h-5">
                                    <input id="overdueInvoiceAlerts" name="overdueInvoiceAlerts" type="checkbox" checked={settings.overdueInvoiceAlerts} onChange={handleChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded ml-3" />
                                </div>
                                <div className="text-sm">
                                    <label htmlFor="overdueInvoiceAlerts" className="font-medium text-gray-700">تنبيهات الفواتير المتأخرة</label>
                                </div>
                           </div>
                           <div className="relative flex items-start">
                               <div className="flex items-center h-5">
                                    <input id="lowInventoryAlerts" name="lowInventoryAlerts" type="checkbox" checked={settings.lowInventoryAlerts} onChange={handleChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded ml-3" />
                                </div>
                                <div className="text-sm">
                                    <label htmlFor="lowInventoryAlerts" className="font-medium text-gray-700">تنبيهات انخفاض المخزون</label>
                                </div>
                           </div>
                        </div>
                    )}
                </SettingsFormTab>;
            case 'roles':
                 return <RolesPermissionsTab />;
            case 'data':
                return <DataManagementTab />;
            case 'apiKeys':
                return <ApiKeyManager />;
            default:
                return <div>الرجاء اختيار قسم.</div>;
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">الإعدادات</h2>
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4">
                    <nav className="flex flex-col space-y-2">
                        {settingsTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 text-right ${
                                    activeTab === tab.id
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <tab.icon size={18} className="ml-3" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="md:w-3/4">
                    {renderTabContent()}
                </main>
            </div>
        </div>
    );
};

export default Settings;