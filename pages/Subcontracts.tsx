import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Subcontract, Project, Supplier, SubcontractorPayment } from '../types';
import { PlusCircle, Search, Edit, Trash2, Filter, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const getStatusChip = (status: Subcontract['status']) => {
  const styles = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    terminated: 'bg-red-100 text-red-800',
  };
  const text = {
    draft: 'مسودة',
    active: 'نشط',
    completed: 'مكتمل',
    terminated: 'ملغي',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const Subcontracts: React.FC = () => {
  const [subcontracts, setSubcontracts] = useState<Subcontract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allPayments, setAllPayments] = useState<SubcontractorPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcontract | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Subcontract['status']>('all');
  const { hasPermission } = useAuth();

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [subData, projData, supData, payData] = await Promise.all([
                api.getSubcontracts(),
                api.getProjects(),
                api.getSuppliers(),
                api.getAllSubcontractorPayments()
            ]);
            setSubcontracts(subData);
            setProjects(projData);
            setSuppliers(supData);
            setAllPayments(payData);
        } catch (error) {
            console.error("Failed to fetch subcontracts data", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [usingFirebase]);

  const initialFormState: Omit<Subcontract, 'id'> = {
    projectId: '', projectName: '', subcontractorId: '', subcontractorName: '',
    scopeOfWork: '', contractAmount: 0, retentionPercentage: 0, status: 'draft', date: new Date().toISOString().split('T')[0]
  };
  const [formData, setFormData] = useState(initialFormState);
  
  const subcontractFinancials = useMemo(() => {
    const financials = new Map<string, { paid: number }>();
    for (const sub of subcontracts) {
      const paymentsForSub = allPayments.filter(p => p.subcontractId === sub.id);
      const paid = paymentsForSub.reduce((sum, p) => sum + p.netPayment, 0);
      financials.set(sub.id, { paid });
    }
    return financials;
  }, [subcontracts, allPayments]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumber = ['contractAmount', 'retentionPercentage'].includes(name);
    
    let updatedFormData = { ...formData, [name]: isNumber ? Number(value) : value };
    
    if (name === 'projectId') {
      const selectedProject = projects.find(p => p.id === value);
      updatedFormData.projectName = selectedProject?.name || '';
    }
    if (name === 'subcontractorId') {
      const selectedSupplier = suppliers.find(s => s.id === value);
      updatedFormData.subcontractorName = selectedSupplier?.name || '';
    }

    setFormData(updatedFormData);
  };
  
  const openAddModal = () => {
    setEditingSub(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };
  
  const openEditModal = (sub: Subcontract) => {
    setEditingSub(sub);
    setFormData(sub);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSave = async () => {
    if (!formData.projectId || !formData.subcontractorId) {
      alert("الرجاء اختيار مشروع ومقاول باطن.");
      return;
    }
    try {
        if (editingSub) {
          await api.updateSubcontract({ ...editingSub, ...formData });
        } else {
          await api.addSubcontract(formData);
        }
        const updatedSubs = await api.getSubcontracts();
        setSubcontracts(updatedSubs);
        closeModal();
    } catch (error) {
        console.error("Failed to save subcontract", error);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العقد؟ سيتم حذف جميع الدفعات المرتبطة به.')) {
        try {
            await api.deleteSubcontract(id);
            setSubcontracts(subcontracts.filter(s => s.id !== id));
            // Refetch payments as well
            const updatedPayments = await api.getAllSubcontractorPayments();
            setAllPayments(updatedPayments);
        } catch (error) {
            console.error("Failed to delete subcontract", error);
        }
    }
  };
  
  const filteredSubcontracts = useMemo(() =>
    subcontracts.filter(sub =>
      ((sub.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
       (sub.subcontractorName || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || sub.status === statusFilter)
    ), [subcontracts, searchQuery, statusFilter]);

  const canCreate = hasPermission('subcontracts', 'create');
  const canEdit = hasPermission('subcontracts', 'edit');
  const canDelete = hasPermission('subcontracts', 'delete');

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">إدارة عقود الباطن</h2>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative">
              <input type="text" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="absolute inset-y-0 left-0 flex items-center pl-3"><Search className="w-5 h-5 text-gray-400" /></span>
            </div>
            {canCreate && (
                <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    <PlusCircle size={16} className="ml-2"/> إضافة عقد جديد
                </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse mb-6 border-t pt-4">
          <Filter size={16} className="text-gray-600"/>
          <span className="text-sm font-medium text-gray-700">تصفية بالحالة:</span>
          {['all', 'draft', 'active', 'completed', 'terminated'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s as any)} className={`px-3 py-1 text-sm rounded-full ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {s === 'all' ? 'الكل' : {draft:'مسودة', active:'نشط', completed:'مكتمل', terminated:'ملغي'}[s]}
            </button>
          ))}
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">مقاول الباطن</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المشروع</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">مبلغ العقد</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المبلغ المدفوع</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الحالة</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="mr-3 text-gray-500">جاري تحميل العقود...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSubcontracts.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b"><Link to={`/subcontracts/${sub.id}`} className="text-blue-600 hover:underline font-semibold">{sub.subcontractorName}</Link></td>
                  <td className="py-3 px-4 border-b">{sub.projectName}</td>
                  <td className="py-3 px-4 border-b">﷼{sub.contractAmount.toLocaleString()}</td>
                  <td className="py-3 px-4 border-b">﷼{(subcontractFinancials.get(sub.id)?.paid || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 border-b">{getStatusChip(sub.status)}</td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex justify-center items-center space-x-2 space-x-reverse">
                      {canEdit && <button onClick={() => openEditModal(sub)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={18}/></button>}
                      {canDelete && <button onClick={() => handleDelete(sub.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={18}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSub ? 'تعديل عقد باطن' : 'إضافة عقد باطن جديد'}>
        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المشروع</label>
                <select name="projectId" value={formData.projectId} onChange={handleInputChange} required className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md">
                  <option value="" disabled>اختر مشروع...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مقاول الباطن (من الموردين)</label>
                <select name="subcontractorId" value={formData.subcontractorId} onChange={handleInputChange} required className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md">
                  <option value="" disabled>اختر مقاول...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نطاق العمل</label>
              <textarea name="scopeOfWork" value={formData.scopeOfWork} onChange={handleInputChange} rows={3} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ العقد (﷼)</label>
                <input type="number" name="contractAmount" value={formData.contractAmount} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الضمان (%)</label>
                <input type="number" name="retentionPercentage" value={formData.retentionPercentage} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <select name="status" value={formData.status} onChange={handleInputChange} required className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md">
                  {Object.entries({draft:'مسودة', active:'نشط', completed:'مكتمل', terminated:'ملغي'}).map(([key, val]) => <option key={key} value={key}>{val}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">حفظ</button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default Subcontracts;