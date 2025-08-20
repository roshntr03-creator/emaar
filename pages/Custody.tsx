import React, { useState, useMemo, useEffect } from 'react';
import type { Custody, Employee, Project } from '../types';
import { PlusCircle, Search, Edit, Trash2, Filter, HandCoins, AlertCircle, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const getStatusChip = (status: Custody['status']) => {
  const styles = {
    open: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-green-100 text-green-800',
  };
  const text = {
    open: 'مفتوحة',
    closed: 'مغلقة',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const Custody: React.FC = () => {
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Pick<Project, 'id' | 'name'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustody, setEditingCustody] = useState<Custody | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Custody['status']>('all');
  const { hasPermission } = useAuth();

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [custodiesData, employeesData, projectsData] = await Promise.all([
                api.getCustodies(),
                api.getEmployees(),
                api.getProjects()
            ]);
            setCustodies(custodiesData);
            setEmployees(employeesData);
            setProjects(projectsData.map(({ id, name }) => ({ id, name })));
        } catch (error) {
            console.error("Failed to load custody data", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [usingFirebase]);

  const initialFormState: Omit<Custody, 'id'> = { employeeId: '', employeeName: '', projectId: null, projectName: null, date: '', description: '', amount: 0, settledAmount: 0, status: 'open' };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: ['amount', 'settledAmount'].includes(name) ? Number(value) : value });
  };

  const openAddModal = () => {
    setEditingCustody(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (custody: Custody) => {
    setEditingCustody(custody);
    setFormData(custody);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustody(null);
  };

  const handleSave = async () => {
    const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
    if (!selectedEmployee) {
      alert('الرجاء اختيار موظف.');
      return;
    }
    
    const selectedProject = projects.find(proj => proj.id === formData.projectId);
    const updatedFormData = {
        ...formData,
        employeeName: selectedEmployee.name,
        projectName: selectedProject?.name || null
    };

    try {
        if (editingCustody) {
            await api.updateCustody({ ...editingCustody, ...updatedFormData });
        } else {
            await api.addCustody(updatedFormData);
        }
        const updatedCustodies = await api.getCustodies();
        setCustodies(updatedCustodies);
        closeModal();
    } catch (error) {
        console.error("Failed to save custody", error);
    }
  };

  const handleDelete = async (custodyId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذه العهدة؟')) {
      try {
        await api.deleteCustody(custodyId);
        setCustodies(custodies.filter(c => c.id !== custodyId));
      } catch (error) {
        console.error("Failed to delete custody", error);
      }
    }
  };

  const filteredCustodies = useMemo(() =>
    custodies.filter(c =>
      ((c.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.projectName || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || c.status === statusFilter)
    ), [custodies, searchQuery, statusFilter]);

  const totals = useMemo(() => {
    return custodies.reduce((acc, c) => {
        acc.total += c.amount;
        acc.outstanding += (c.amount - c.settledAmount);
        return acc;
    }, { total: 0, outstanding: 0 });
  }, [custodies]);

  const canEdit = hasPermission('custody', 'edit');
  const canDelete = hasPermission('custody', 'delete');

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <StatCard 
            icon={<HandCoins className="text-blue-500" />}
            title="إجمالي العهد"
            value={`﷼ ${totals.total.toLocaleString()}`}
        />
        <StatCard 
            icon={<AlertCircle className="text-red-500" />}
            title="الرصيد المتبقي (غير مسدد)"
            value={`﷼ ${totals.outstanding.toLocaleString()}`}
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">إدارة العهد</h2>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute inset-y-0 left-0 flex items-center pl-3"><Search className="w-5 h-5 text-gray-400" /></span>
            </div>
            {hasPermission('custody', 'create') && (
              <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <PlusCircle size={16} className="ml-2" />
                إضافة عهدة جديدة
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse mb-6 border-t pt-4">
            <Filter size={16} className="text-gray-600"/>
            <span className="text-sm font-medium text-gray-700">تصفية:</span>
            <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>الكل</button>
            <button onClick={() => setStatusFilter('open')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'open' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>مفتوحة</button>
            <button onClick={() => setStatusFilter('closed')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'closed' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>مغلقة</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الرقم</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">اسم الموظف</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">التاريخ</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المشروع</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المبلغ الإجمالي</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المبلغ المسدد</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الرصيد المتبقي</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الحالة</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="mr-3 text-gray-500">جاري تحميل العهد...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustodies.length > 0 ? filteredCustodies.map((custody) => {
                const remaining = custody.amount - custody.settledAmount;
                return (
                  <tr key={custody.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b font-mono text-blue-600">{custody.id}</td>
                    <td className="py-3 px-4 border-b">{custody.employeeName}</td>
                    <td className="py-3 px-4 border-b">{custody.date}</td>
                    <td className="py-3 px-4 border-b">{custody.projectName || '-'}</td>
                    <td className="py-3 px-4 border-b">﷼{custody.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 border-b">﷼{custody.settledAmount.toLocaleString()}</td>
                    <td className="py-3 px-4 border-b font-bold">{remaining > 0 ? `﷼${remaining.toLocaleString()}`: '-'}</td>
                    <td className="py-3 px-4 border-b">{getStatusChip(custody.status)}</td>
                    <td className="py-3 px-4 border-b">
                      <div className="flex justify-center items-center space-x-2 space-x-reverse">
                        {custody.status === 'open' && canEdit && <button onClick={() => openEditModal(custody)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={18} /></button>}
                        {custody.status === 'open' && canDelete && <button onClick={() => handleDelete(custody.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={18} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-500">
                    لا توجد عهد لعرضها.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCustody ? "تعديل عهدة" : "إضافة عهدة جديدة"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">اسم الموظف</label>
                  <select
                    id="employeeId"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="" disabled>اختر موظف...</option>
                    {employees.filter(e => e.status === 'active' || e.id === formData.employeeId).map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                    <input type="date" name="date" id="date" value={formData.date} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
            </div>
            <div>
              <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-1">المشروع (اختياري)</label>
              <select
                id="projectId"
                name="projectId"
                value={formData.projectId || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">بدون مشروع</option>
                {projects.map(proj => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">المبلغ الإجمالي (﷼)</label>
                    <input type="number" name="amount" id="amount" value={formData.amount} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="settledAmount" className="block text-sm font-medium text-gray-700 mb-1">المبلغ المسدد (﷼)</label>
                    <input type="number" name="settledAmount" id="settledAmount" value={formData.settledAmount} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
              <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} required rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="open">مفتوحة</option>
                <option value="closed">مغلقة</option>
              </select>
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

export default Custody;