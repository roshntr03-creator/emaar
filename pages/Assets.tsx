import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { Asset, AiDepreciationEstimate, Project } from '../types';
import { PlusCircle, Search, Edit, Trash2, Filter, Loader2, Truck, Wrench, BrainCircuit, Briefcase } from 'lucide-react';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const getStatusChip = (status: Asset['status']) => {
  const styles = {
    available: 'bg-green-100 text-green-800',
    in_use: 'bg-blue-100 text-blue-800',
    under_maintenance: 'bg-yellow-100 text-yellow-800',
    sold: 'bg-gray-100 text-gray-800',
  };
  const text = {
    available: 'متوفر',
    in_use: 'قيد الاستخدام',
    under_maintenance: 'تحت الصيانة',
    sold: 'مباع',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Asset['status']>('all');
  const { hasPermission } = useAuth();
  
  const [isDepreciationModalOpen, setIsDepreciationModalOpen] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimationLife, setEstimationLife] = useState(5);
  const [estimationResult, setEstimationResult] = useState<AiDepreciationEstimate | null>(null);
  const [estimationError, setEstimationError] = useState('');

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [assetsData, projectsData] = await Promise.all([
                api.getAssets(),
                api.getProjects()
            ]);
            setAssets(assetsData);
            setProjects(projectsData);
        } catch (error) {
            console.error("Failed to fetch assets data", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [usingFirebase]);

  const initialFormState: Omit<Asset, 'id'> = { assetCode: '', name: '', category: 'معدات ثقيلة', purchaseDate: '', purchaseCost: 0, currentValue: 0, status: 'available', assignedProjectName: null, lastMaintenanceDate: null, nextMaintenanceDate: null };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = ['purchaseCost', 'currentValue'].includes(name);
    setFormData({ ...formData, [name]: isNumber ? Number(value) : value });
  };

  const openAddModal = () => {
    setEditingAsset(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData(asset);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSave = async () => {
    try {
        if (editingAsset) {
            await api.updateAsset({ ...editingAsset, ...formData });
        } else {
            await api.addAsset(formData);
        }
        const updatedAssets = await api.getAssets();
        setAssets(updatedAssets);
        closeModal();
    } catch (error) {
        console.error("Failed to save asset", error);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا الأصل؟')) {
      try {
        await api.deleteAsset(assetId);
        setAssets(assets.filter(a => a.id !== assetId));
      } catch (error) {
        console.error("Failed to delete asset", error);
      }
    }
  };
  
  const handleGenerateEstimate = async () => {
    setIsEstimating(true);
    setEstimationResult(null);
    setEstimationError('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `أنت خبير محاسبي. للأصل التالي:
        - اسم الأصل: ${formData.name}
        - تكلفة الشراء: ${formData.purchaseCost} ريال سعودي
        - تاريخ الشراء: ${formData.purchaseDate}
        - العمر الإنتاجي المقدر: ${estimationLife} سنوات

        1.  احسب الإهلاك السنوي باستخدام طريقة القسط الثابت.
        2.  قدر قيمة تخريدية (Salvage Value) معقولة.
        3.  قدم شرحاً مبسطاً للعملية باللغة العربية.
        
        يجب أن يكون الناتج بصيغة JSON حصراً.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
            annualDepreciation: { type: Type.NUMBER },
            salvageValue: { type: Type.NUMBER },
            explanation: { type: Type.STRING }
        },
        required: ["annualDepreciation", "salvageValue", "explanation"]
      };
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema }
      });
      setEstimationResult(JSON.parse(response.text));
    } catch (e) {
      setEstimationError("عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsEstimating(false);
    }
  };

  const filteredAssets = useMemo(() =>
    assets.filter(a =>
      (a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       a.assetCode.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || a.status === statusFilter)
    ), [assets, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const inUseCount = assets.filter(a => a.status === 'in_use').length;
    const needsMaintenance = assets.filter(a => a.nextMaintenanceDate && new Date(a.nextMaintenanceDate) < new Date(new Date().setDate(new Date().getDate() + 30))).length;
    return { totalValue, inUseCount, needsMaintenance };
  }, [assets]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard icon={<Truck className="text-blue-500" />} title="القيمة الإجمالية للأصول" value={`﷼ ${stats.totalValue.toLocaleString()}`} />
        <StatCard icon={<Briefcase className="text-green-500" />} title="أصول قيد الاستخدام" value={stats.inUseCount.toString()} />
        <StatCard icon={<Wrench className="text-red-500" />} title="تحتاج صيانة قريباً" value={stats.needsMaintenance.toString()} />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">إدارة الأصول</h2>
          {hasPermission('assets', 'create') && (
            <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              <PlusCircle size={16} className="ml-2"/> إضافة أصل جديد
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse mb-6 border-t pt-4">
          <Filter size={16} className="text-gray-600"/>
          <span className="text-sm font-medium text-gray-700">تصفية:</span>
          <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>الكل</button>
          {Object.keys({available: '', in_use: '', under_maintenance: '', sold: ''}).map(s => (
            <button key={s} onClick={() => setStatusFilter(s as Asset['status'])} className={`px-3 py-1 text-sm rounded-full ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {{available: 'متوفر', in_use: 'قيد الاستخدام', under_maintenance: 'تحت الصيانة', sold: 'مباع'}[s]}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b">رمز الأصل</th>
                <th className="py-3 px-4 border-b">اسم الأصل</th>
                <th className="py-3 px-4 border-b">الفئة</th>
                <th className="py-3 px-4 border-b">القيمة الحالية</th>
                <th className="py-3 px-4 border-b">الحالة</th>
                <th className="py-3 px-4 border-b">المشروع الحالي</th>
                <th className="py-3 px-4 border-b">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-10"><Loader2 className="mx-auto animate-spin" /></td></tr>
              ) : filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">{asset.assetCode}</td>
                  <td className="py-3 px-4 border-b">{asset.name}</td>
                  <td className="py-3 px-4 border-b">{asset.category}</td>
                  <td className="py-3 px-4 border-b">﷼{asset.currentValue.toLocaleString()}</td>
                  <td className="py-3 px-4 border-b">{getStatusChip(asset.status)}</td>
                  <td className="py-3 px-4 border-b">{asset.assignedProjectName || '-'}</td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex justify-center items-center space-x-2 space-x-reverse">
                      {hasPermission('assets', 'edit') && <button onClick={() => openEditModal(asset)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={18}/></button>}
                      {hasPermission('assets', 'delete') && <button onClick={() => handleDelete(asset.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={18}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAsset ? "تعديل أصل" : "إضافة أصل جديد"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="assetCode" value={formData.assetCode} onChange={handleInputChange} placeholder="رمز الأصل" required className="px-3 py-2 border rounded-md" />
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="اسم الأصل" required className="px-3 py-2 border rounded-md" />
            </div>
            <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-3 py-2 border bg-white rounded-md">
                <option>معدات ثقيلة</option>
                <option>مركبات</option>
                <option>أدوات</option>
                <option>أثاث مكتبي</option>
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input type="number" name="purchaseCost" value={formData.purchaseCost} onChange={handleInputChange} placeholder="تكلفة الشراء" required className="px-3 py-2 border rounded-md" />
              <input type="number" name="currentValue" value={formData.currentValue} onChange={handleInputChange} placeholder="القيمة الحالية" required className="px-3 py-2 border rounded-md" />
            </div>
             <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs">تاريخ الشراء</label><input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-md" /></div>
               <select name="status" value={formData.status} onChange={handleInputChange} className="self-end w-full px-3 py-2 border bg-white rounded-md">
                    {Object.entries({available: 'متوفر', in_use: 'قيد الاستخدام', under_maintenance: 'تحت الصيانة', sold: 'مباع'}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs">آخر صيانة</label><input type="date" name="lastMaintenanceDate" value={formData.lastMaintenanceDate || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-md" /></div>
                <div><label className="text-xs">الصيانة القادمة</label><input type="date" name="nextMaintenanceDate" value={formData.nextMaintenanceDate || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-md" /></div>
            </div>
            <select name="assignedProjectName" value={formData.assignedProjectName || ''} onChange={handleInputChange} className="w-full px-3 py-2 border bg-white rounded-md">
                <option value="">غير معين لمشروع</option>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            <button type="button" onClick={() => setIsDepreciationModalOpen(true)} className="w-full flex items-center justify-center text-sm text-indigo-600 hover:text-indigo-800">
                <BrainCircuit size={16} className="ml-2"/> تقدير الإهلاك (AI)
            </button>
          </div>
          <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">حفظ</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDepreciationModalOpen} onClose={() => setIsDepreciationModalOpen(false)} title="تقدير الإهلاك بالذكاء الاصطناعي">
        <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">العمر الإنتاجي المقدر (سنوات)</label>
              <input type="number" value={estimationLife} onChange={e => setEstimationLife(Number(e.target.value))} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <button onClick={handleGenerateEstimate} disabled={isEstimating} className="w-full flex justify-center items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
              {isEstimating ? <Loader2 className="animate-spin"/> : 'حساب'}
            </button>
            {estimationError && <p className="text-sm text-red-600">{estimationError}</p>}
            {estimationResult && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex justify-between"><span className="text-gray-600">الإهلاك السنوي:</span><span className="font-bold">﷼{estimationResult.annualDepreciation.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">القيمة التخريدية المقدرة:</span><span className="font-bold">﷼{estimationResult.salvageValue.toLocaleString()}</span></div>
                    <p className="text-xs text-gray-500 pt-2 border-t">{estimationResult.explanation}</p>
                </div>
            )}
        </div>
      </Modal>
    </>
  );
};

export default Assets;
