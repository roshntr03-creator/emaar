import React, { useState, useMemo, useEffect } from 'react';
import type { Voucher, Account } from '../types';
import { PlusCircle, Search, Edit, Trash2, ArrowUpCircle, ArrowDownCircle, Filter, Loader2, FileText } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const getStatusChip = (status: Voucher['status']) => {
  const styles = {
    draft: 'bg-gray-100 text-gray-800',
    approved: 'bg-green-100 text-green-800',
  };
  const text = {
    draft: 'مسودة',
    approved: 'معتمد',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const getTypeInfo = (type: Voucher['type']) => {
  if (type === 'payment') {
    return {
      label: 'سند صرف',
      icon: <ArrowUpCircle className="w-5 h-5 text-red-500" />,
      style: 'text-red-700',
    };
  }
  return {
    label: 'سند قبض',
    icon: <ArrowDownCircle className="w-5 h-5 text-green-500" />,
    style: 'text-green-700',
  };
};

const Vouchers: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ type: 'all', status: 'all' });
  const { hasPermission } = useAuth();
  
  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [vouchersData, accountsData] = await Promise.all([
                api.getVouchers(),
                api.getAccounts()
            ]);
            setVouchers(vouchersData);
            setAccounts(accountsData);
        } catch (error) {
            console.error("Failed to load data for vouchers", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [usingFirebase]);
  
  const initialFormState: Omit<Voucher, 'id'> = { type: 'payment', date: '', person: '', description: '', amount: 0, paymentMethod: 'cash', cashBankAccount: '', correspondingAccount: '', status: 'draft' };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'amount' ? Number(value) : value });
  };

  const openAddModal = (type: Voucher['type']) => {
    setEditingVoucher(null);
    setFormData({ ...initialFormState, type });
    setIsModalOpen(true);
  };

  const openEditModal = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setFormData(voucher);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVoucher(null);
  };

  const handleSave = async () => {
    try {
        if (editingVoucher) {
            await api.updateVoucher({ ...editingVoucher, ...formData });
        } else {
            await api.addVoucher(formData);
        }
        const updatedVouchers = await api.getVouchers();
        setVouchers(updatedVouchers);
        closeModal();
    } catch (error) {
        console.error("Failed to save voucher", error);
    }
  };

  const handleDelete = async (voucherId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا السند؟')) {
      try {
        await api.deleteVoucher(voucherId);
        setVouchers(vouchers.filter(v => v.id !== voucherId));
      } catch (error) {
        console.error("Failed to delete voucher", error);
      }
    }
  };

  const filteredVouchers = useMemo(() =>
    vouchers.filter(v =>
      ((v.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.person || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.description || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filters.type === 'all' || v.type === filters.type) &&
      (filters.status === 'all' || v.status === filters.status)
    ), [vouchers, searchQuery, filters]);
  
  const modalTitle = editingVoucher
    ? `تعديل ${getTypeInfo(editingVoucher.type).label}`
    : `إضافة ${getTypeInfo(formData.type).label}`;
    
  const canEdit = hasPermission('vouchers', 'edit');
  const canDelete = hasPermission('vouchers', 'delete');
  const showActionsColumn = canEdit || canDelete;

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">السندات</h2>
          {hasPermission('vouchers', 'create') && (
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="relative">
                <input type="text" placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="absolute inset-y-0 left-0 flex items-center pl-3"><Search className="w-5 h-5 text-gray-400" /></span>
              </div>
              <button onClick={() => openAddModal('receipt')} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                <PlusCircle size={16} className="ml-2" /> سند قبض
              </button>
              <button onClick={() => openAddModal('payment')} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                <PlusCircle size={16} className="ml-2" /> سند صرف
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4 space-x-reverse mb-6 border-t pt-4">
            <Filter size={16} className="text-gray-600"/>
            <div>
              <label htmlFor="typeFilter" className="text-sm font-medium text-gray-700 mr-2">النوع:</label>
              <select id="typeFilter" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} className="px-3 py-1 border border-gray-300 rounded-md bg-white">
                <option value="all">الكل</option>
                <option value="receipt">قبض</option>
                <option value="payment">صرف</option>
              </select>
            </div>
            <div>
              <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 mr-2">الحالة:</label>
              <select id="statusFilter" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="px-3 py-1 border border-gray-300 rounded-md bg-white">
                <option value="all">الكل</option>
                <option value="draft">مسودة</option>
                <option value="approved">معتمد</option>
              </select>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">النوع</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الرقم</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">التاريخ</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">{`المدفوع له / المستلم منه`}</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المبلغ</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المستند المرتبط</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الحالة</th>
                {showActionsColumn && <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={showActionsColumn ? 8 : 7} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="mr-3 text-gray-500">جاري تحميل السندات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredVouchers.length > 0 ? filteredVouchers.map((voucher) => {
                const { label, icon, style } = getTypeInfo(voucher.type);
                return (
                  <tr key={voucher.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b"><div className={`flex items-center font-semibold ${style}`}>{icon}<span className="mr-2">{label}</span></div></td>
                    <td className="py-3 px-4 border-b font-mono">{voucher.id}</td>
                    <td className="py-3 px-4 border-b">{voucher.date}</td>
                    <td className="py-3 px-4 border-b">{voucher.person}</td>
                    <td className="py-3 px-4 border-b font-bold">﷼{voucher.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 border-b">
                      {voucher.relatedInvoiceId && (
                        <span className="flex items-center text-xs text-gray-600">
                          <FileText size={14} className="ml-1 text-gray-400" />
                          فاتورة: {voucher.relatedInvoiceId}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 border-b">{getStatusChip(voucher.status)}</td>
                    {showActionsColumn &&
                      <td className="py-3 px-4 border-b">
                        <div className="flex justify-center items-center space-x-2 space-x-reverse">
                          {voucher.status === 'draft' && canEdit && <button onClick={() => openEditModal(voucher)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={18} /></button>}
                          {voucher.status === 'draft' && canDelete && <button onClick={() => handleDelete(voucher.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={18} /></button>}
                        </div>
                      </td>
                    }
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={showActionsColumn ? 8 : 7} className="text-center py-10 text-gray-500">
                    لا توجد سندات لعرضها.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalTitle}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                <input type="date" name="date" id="date" value={formData.date} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label htmlFor="person" className="block text-sm font-medium text-gray-700 mb-1">{formData.type === 'payment' ? 'المدفوع له' : 'المستلم منه'}</label>
                <input type="text" name="person" id="person" value={formData.person} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">المبلغ (﷼)</label>
              <input type="number" name="amount" id="amount" value={formData.amount} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
             <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">البيان</label>
              <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} required rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cashBankAccount" className="block text-sm font-medium text-gray-700 mb-1">{formData.type === 'payment' ? 'حساب الصرف' : 'حساب الإيداع'}</label>
                <select name="cashBankAccount" id="cashBankAccount" value={formData.cashBankAccount} onChange={handleInputChange} required className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md">
                   <option value="">اختر حساب...</option>
                   {accounts.filter(acc => acc.code.startsWith('111')).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
               <div>
                <label htmlFor="correspondingAccount" className="block text-sm font-medium text-gray-700 mb-1">الحساب المقابل</label>
                <select name="correspondingAccount" id="correspondingAccount" value={formData.correspondingAccount} onChange={handleInputChange} required className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md">
                   <option value="">اختر حساب...</option>
                   {accounts.filter(acc => !acc.code.startsWith('111')).map(acc=> <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
                    <select name="paymentMethod" id="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange} required className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md">
                        <option value="cash">نقداً</option>
                        <option value="bank_transfer">تحويل بنكي</option>
                        <option value="cheque">شيك</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                    <select name="status" id="status" value={formData.status} onChange={handleInputChange} required className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md">
                        <option value="draft">مسودة</option>
                        <option value="approved">معتمد</option>
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

export default Vouchers;