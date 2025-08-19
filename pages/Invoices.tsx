import React, { useState, useMemo, useEffect } from 'react';
import type { Invoice, Voucher, Account } from '../types';
import { PlusCircle, Search, Edit, Trash2, Filter, DollarSign, CheckCircle, Clock, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const getStatusChip = (status: 'paid' | 'unpaid' | 'overdue') => {
  switch (status) {
    case 'paid':
      return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">مدفوعة</span>;
    case 'unpaid':
      return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">غير مدفوعة</span>;
    case 'overdue':
      return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">متأخرة</span>;
  }
};

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Invoice['status']>('all');
  const { hasPermission } = useAuth();

  // State for payment modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const initialPaymentFormState: Omit<Voucher, 'id' | 'type'> = { date: '', person: '', description: '', amount: 0, paymentMethod: 'cash', cashBankAccount: '', correspondingAccount: '', status: 'approved', relatedInvoiceId: null };
  const [paymentFormData, setPaymentFormData] = useState(initialPaymentFormState);

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error("Failed to fetch invoices", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [invoicesData, accountsData] = await Promise.all([
                api.getInvoices(),
                api.getAccounts()
            ]);
            setInvoices(invoicesData);
            setAccounts(accountsData);
        } catch (error) {
            console.error("Failed to fetch initial data", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchInitialData();
  }, [usingFirebase]);
  
  const initialFormState: Omit<Invoice, 'id'> = { project: '', amount: 0, status: 'unpaid', issueDate: '', dueDate: '' };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'amount' ? Number(value) : value });
  };

  const openAddModal = () => {
    setEditingInvoice(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
        project: invoice.project,
        amount: invoice.amount,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInvoice(null);
  };

  const handleSave = async () => {
    try {
      if (editingInvoice) {
        await api.updateInvoice({ ...editingInvoice, ...formData });
      } else {
        await api.addInvoice(formData);
      }
      fetchInvoices();
      closeModal();
    } catch (error) {
      console.error("Failed to save invoice", error);
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذه الفاتورة؟')) {
      try {
        await api.deleteInvoice(invoiceId);
        setInvoices(invoices.filter(i => i.id !== invoiceId));
      } catch (error) {
        console.error("Failed to delete invoice", error);
      }
    }
  };

  // --- Payment Modal Handlers ---
  const openPaymentModal = (invoice: Invoice) => {
    const revenueAccount = accounts.find(a => a.code.startsWith('4')); // Simplified
    setPayingInvoice(invoice);
    setPaymentFormData({
        date: new Date().toISOString().split('T')[0],
        person: invoice.clientName || invoice.project,
        description: `تحصيل دفعة للفاتورة رقم ${invoice.id}`,
        amount: invoice.amount,
        paymentMethod: 'bank_transfer',
        cashBankAccount: '',
        correspondingAccount: revenueAccount?.id || '',
        status: 'approved',
        relatedInvoiceId: invoice.id,
    });
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPayingInvoice(null);
  };
  
  const handlePaymentSave = async () => {
    if (!payingInvoice || !paymentFormData.cashBankAccount) {
        alert('الرجاء اختيار حساب الإيداع.');
        return;
    }
    try {
        // 1. Create the receipt voucher
        const newVoucherData: Omit<Voucher, 'id'> = {
            ...paymentFormData,
            type: 'receipt',
        };
        await api.addVoucher(newVoucherData);

        // 2. Update the invoice status
        const updatedInvoice: Invoice = { ...payingInvoice, status: 'paid' };
        await api.updateInvoice(updatedInvoice);

        // 3. Refresh data and close modal
        fetchInvoices();
        closePaymentModal();
        alert('تم تسجيل الدفعة وتحديث الفاتورة بنجاح.');

    } catch(error) {
        console.error("Failed to register payment", error);
        alert('حدث خطأ أثناء تسجيل الدفعة.');
    }
  };


  const filteredInvoices = useMemo(() => 
    invoices.filter(invoice =>
      (invoice.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || invoice.status === statusFilter)
    ), [invoices, searchQuery, statusFilter]
  );

  const totals = useMemo(() => {
    return invoices.reduce((acc, inv) => {
        acc.total += inv.amount;
        if (inv.status === 'paid') acc.paid += inv.amount;
        if (inv.status === 'unpaid' || inv.status === 'overdue') acc.due += inv.amount;
        return acc;
    }, { total: 0, paid: 0, due: 0 });
  }, [invoices]);
  
  const cashAndBankAccounts = useMemo(() => accounts.filter(acc => acc.code.startsWith('111')), [accounts]);
  
  const canCreateVoucher = hasPermission('vouchers', 'create');
  const canEditInvoice = hasPermission('invoices', 'edit');
  const canDeleteInvoice = hasPermission('invoices', 'delete');

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard 
            icon={<DollarSign className="text-blue-500" />}
            title="إجمالي الفواتير"
            value={`﷼ ${totals.total.toLocaleString()}`}
        />
        <StatCard 
            icon={<CheckCircle className="text-green-500" />}
            title="إجمالي المدفوع"
            value={`﷼ ${totals.paid.toLocaleString()}`}
        />
        <StatCard 
            icon={<Clock className="text-red-500" />}
            title="إجمالي المستحق"
            value={`﷼ ${totals.due.toLocaleString()}`}
        />
    </div>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">إدارة الفواتير</h2>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative">
                <input
                    type="text"
                    placeholder="بحث برقم الفاتورة أو المشروع..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="بحث في الفواتير"
                />
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="w-5 h-5 text-gray-400" />
                </span>
            </div>
            {hasPermission('invoices', 'create') && (
              <button 
                  onClick={openAddModal}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusCircle size={16} className="ml-2"/>
                إصدار فاتورة جديدة
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse mb-6 border-t pt-4">
            <Filter size={16} className="text-gray-600"/>
            <span className="text-sm font-medium text-gray-700">تصفية:</span>
            <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>الكل</button>
            <button onClick={() => setStatusFilter('paid')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'paid' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>مدفوعة</button>
            <button onClick={() => setStatusFilter('unpaid')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'unpaid' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>غير مدفوعة</button>
            <button onClick={() => setStatusFilter('overdue')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'overdue' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>متأخرة</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">رقم الفاتورة</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المشروع</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المبلغ</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الحالة</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">تاريخ الإصدار</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">تاريخ الاستحقاق</th>
                <th scope="col" className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="mr-3 text-gray-500">جاري تحميل الفواتير...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length > 0 ? filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b font-mono text-blue-600">{invoice.id}</td>
                  <td className="py-3 px-4 border-b">{invoice.project}</td>
                  <td className="py-3 px-4 border-b">﷼{invoice.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 border-b">{getStatusChip(invoice.status)}</td>
                  <td className="py-3 px-4 border-b">{invoice.issueDate}</td>
                  <td className="py-3 px-4 border-b">{invoice.dueDate}</td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex justify-center items-center space-x-1 space-x-reverse">
                        {invoice.status !== 'paid' && canCreateVoucher && (
                           <button onClick={() => openPaymentModal(invoice)} className="text-green-600 hover:text-green-800 p-1" aria-label={`تسجيل دفعة للفاتورة ${invoice.id}`} title="تسجيل دفعة">
                                <DollarSign size={18}/>
                            </button>
                        )}
                        {canEditInvoice && <button onClick={() => openEditModal(invoice)} className="text-blue-500 hover:text-blue-700 p-1" aria-label={`تعديل فاتورة ${invoice.id}`} title="تعديل"><Edit size={18}/></button>}
                        {canDeleteInvoice && <button onClick={() => handleDelete(invoice.id)} className="text-red-500 hover:text-red-700 p-1" aria-label={`حذف فاتورة ${invoice.id}`} title="حذف"><Trash2 size={18}/></button>}
                    </div>
                  </td>
                </tr>
              )) : (
                 <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500">
                    لا توجد فواتير لعرضها.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingInvoice ? "تعديل الفاتورة" : "إصدار فاتورة جديدة"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">المشروع</label>
              <input type="text" name="project" id="project" value={formData.project} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">المبلغ (﷼)</label>
              <input type="number" name="amount" id="amount" value={formData.amount} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
             <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
              <select name="status" id="status" value={formData.status} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="unpaid">غير مدفوعة</option>
                <option value="paid">مدفوعة</option>
                <option value="overdue">متأخرة</option>
              </select>
            </div>
            <div>
              <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700 mb-1">تاريخ الإصدار</label>
              <input type="date" name="issueDate" id="issueDate" value={formData.issueDate} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">تاريخ الاستحقاق</label>
              <input type="date" name="dueDate" id="dueDate" value={formData.dueDate} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
              إلغاء
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isPaymentModalOpen} onClose={closePaymentModal} title={`تسجيل دفعة للفاتورة ${payingInvoice?.id}`}>
        <form onSubmit={(e) => { e.preventDefault(); handlePaymentSave(); }}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">المبلغ</label>
                    <p className="font-bold text-lg mt-1">﷼{payingInvoice?.amount.toLocaleString()}</p>
                </div>
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">تاريخ التحصيل</label>
                    <input type="date" name="date" id="date" value={paymentFormData.date} onChange={(e) => setPaymentFormData({...paymentFormData, date: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                 <div>
                    <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">طريقة التحصيل</label>
                    <select name="paymentMethod" id="paymentMethod" value={paymentFormData.paymentMethod} onChange={(e) => setPaymentFormData({...paymentFormData, paymentMethod: e.target.value as any})} required className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md">
                        <option value="cash">نقداً</option>
                        <option value="bank_transfer">تحويل بنكي</option>
                        <option value="cheque">شيك</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="cashBankAccount" className="block text-sm font-medium text-gray-700 mb-1">حساب الإيداع</label>
                    <select name="cashBankAccount" id="cashBankAccount" value={paymentFormData.cashBankAccount} onChange={(e) => setPaymentFormData({...paymentFormData, cashBankAccount: e.target.value})} required className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md">
                        <option value="">اختر حساب...</option>
                        {cashAndBankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                <button type="button" onClick={closePaymentModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">تأكيد التحصيل</button>
            </div>
        </form>
      </Modal>
    </>
  );
};

export default Invoices;