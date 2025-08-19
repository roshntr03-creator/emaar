import React, { useState, useMemo, useEffect } from 'react';
import type { ChangeOrder } from '../types';
import { PlusCircle, Search, Edit, Trash2, Filter, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const getStatusChip = (status: ChangeOrder['status']) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  const text = {
    pending: 'قيد المراجعة',
    approved: 'معتمد',
    rejected: 'مرفوض',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const ChangeOrders: React.FC = () => {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ChangeOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ChangeOrder['status']>('all');
  const { hasPermission } = useAuth();

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  useEffect(() => {
    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const data = await api.getChangeOrders();
            setChangeOrders(data);
        } catch (error) {
            console.error("Failed to fetch change orders", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchOrders();
  }, [usingFirebase]);

  const initialFormState: Omit<ChangeOrder, 'id'> = { projectName: '', date: '', description: '', amount: 0, status: 'pending' };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'amount' ? Number(value) : value });
  };

  const openAddModal = () => {
    setEditingOrder(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (order: ChangeOrder) => {
    setEditingOrder(order);
    setFormData(order);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
  };

  const handleSave = async () => {
    try {
        if (editingOrder) {
            await api.updateChangeOrder({ ...editingOrder, ...formData });
        } else {
            await api.addChangeOrder(formData);
        }
        const updatedOrders = await api.getChangeOrders();
        setChangeOrders(updatedOrders);
        closeModal();
    } catch (error) {
        console.error("Failed to save change order", error);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف أمر التغيير هذا؟')) {
      try {
        await api.deleteChangeOrder(orderId);
        setChangeOrders(changeOrders.filter(o => o.id !== orderId));
      } catch (error) {
        console.error("Failed to delete change order", error);
      }
    }
  };

  const filteredOrders = useMemo(() =>
    changeOrders.filter(order =>
      (order.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || order.status === statusFilter)
    ), [changeOrders, searchQuery, statusFilter]);

  const totals = useMemo(() => {
    return changeOrders.reduce((acc, order) => {
        if (order.status === 'approved') acc.approved += order.amount;
        if (order.status === 'pending') acc.pending += order.amount;
        return acc;
    }, { approved: 0, pending: 0 });
  }, [changeOrders]);

  const canEdit = hasPermission('changeOrders', 'edit');
  const canDelete = hasPermission('changeOrders', 'delete');

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <StatCard 
              icon={<CheckCircle className="text-green-500" />}
              title="قيمة الأوامر المعتمدة"
              value={`﷼ ${totals.approved.toLocaleString()}`}
          />
          <StatCard 
              icon={<Clock className="text-yellow-500" />}
              title="قيمة الأوامر قيد المراجعة"
              value={`﷼ ${totals.pending.toLocaleString()}`}
          />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">إدارة أوامر التغيير</h2>
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
            {hasPermission('changeOrders', 'create') && (
              <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <PlusCircle size={16} className="ml-2" />
                إضافة أمر تغيير
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse mb-6 border-t pt-4">
            <Filter size={16} className="text-gray-600"/>
            <span className="text-sm font-medium text-gray-700">تصفية:</span>
            <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>الكل</button>
            <button onClick={() => setStatusFilter('pending')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>قيد المراجعة</button>
            <button onClick={() => setStatusFilter('approved')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'approved' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>معتمد</button>
            <button onClick={() => setStatusFilter('rejected')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'rejected' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>مرفوض</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الرقم</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المشروع</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">التاريخ</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الوصف</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المبلغ</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الحالة</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b font-mono text-blue-600">{order.id}</td>
                  <td className="py-3 px-4 border-b">{order.projectName}</td>
                  <td className="py-3 px-4 border-b">{order.date}</td>
                  <td className="py-3 px-4 border-b max-w-sm truncate">{order.description}</td>
                  <td className={`py-3 px-4 border-b font-semibold ${order.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {order.amount >= 0 ? `+ ﷼${order.amount.toLocaleString()}` : `- ﷼${Math.abs(order.amount).toLocaleString()}`}
                  </td>
                  <td className="py-3 px-4 border-b">{getStatusChip(order.status)}</td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex justify-center items-center space-x-2 space-x-reverse">
                      {(order.status === 'pending' || canEdit) && <button onClick={() => openEditModal(order)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={18} /></button>}
                      {(order.status === 'pending' || canDelete) && <button onClick={() => handleDelete(order.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={18} /></button>}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500">
                    لا توجد أوامر تغيير لعرضها.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingOrder ? "تعديل أمر تغيير" : "إضافة أمر تغيير جديد"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">اسم المشروع</label>
              <input type="text" name="projectName" id="projectName" value={formData.projectName} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                    <input type="date" name="date" id="date" value={formData.date} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">المبلغ (﷼)</label>
                    <input type="number" name="amount" id="amount" value={formData.amount} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="سالب للتخفيض" />
                </div>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
              <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} required rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
            </div>
             <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
              <select name="status" id="status" value={formData.status} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                <option value="pending">قيد المراجعة</option>
                <option value="approved">معتمد</option>
                <option value="rejected">مرفوض</option>
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

export default ChangeOrders;