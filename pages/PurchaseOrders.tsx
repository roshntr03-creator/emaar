import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { PurchaseOrder, PurchaseOrderLine } from '../types';
import { PlusCircle, Search, Edit, Trash2, XCircle, Filter, Loader2, Send, CheckCircle, Truck, Book } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const statusMap: Record<PurchaseOrder['status'], string> = {
    draft: 'مسودة',
    submitted: 'مرسل',
    approved: 'معتمد',
    completed: 'مكتمل',
    cancelled: 'ملغي',
};

const getStatusChip = (status: PurchaseOrder['status']) => {
  const styles: Record<PurchaseOrder['status'], string> = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{statusMap[status]}</span>;
};

const calculateTotal = (lines: PurchaseOrderLine[]) => {
    return lines.reduce((total, line) => total + (line.quantity * line.unitPrice), 0);
}

const PurchaseOrders: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseOrder['status']>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const { hasPermission } = useAuth();
  
  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;
  
  const fetchPOs = async () => {
    setIsLoading(true);
    try {
        const data = await api.getPurchaseOrders();
        setPurchaseOrders(data);
    } catch (error) {
        console.error("Failed to fetch purchase orders", error);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, [usingFirebase]);

  const emptyLine: PurchaseOrderLine = { description: '', quantity: 1, unitPrice: 0 };
  const initialFormState: Omit<PurchaseOrder, 'id' | 'journalVoucherId'> = { supplierName: '', projectName: '', date: '', status: 'draft', lines: [emptyLine] };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleLineChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [name]: name === 'description' ? value : Number(value) };
    setFormData({ ...formData, lines: newLines });
  };
  
  const addLine = () => setFormData({ ...formData, lines: [...formData.lines, emptyLine]});
  const removeLine = (index: number) => {
    if (formData.lines.length > 1) {
        setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) });
    }
  };

  const openAddModal = () => {
    setEditingPO(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (po: PurchaseOrder) => {
    setEditingPO(po);
    setFormData(po);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPO(null);
  };

  const handleSave = async () => {
    try {
        if (editingPO) {
            await api.updatePurchaseOrder({ ...editingPO, ...formData });
        } else {
            await api.addPurchaseOrder(formData);
        }
        fetchPOs();
        closeModal();
    } catch (error) {
        console.error("Failed to save purchase order", error);
    }
  };

  const handleDelete = async (poId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف أمر الشراء هذا؟')) {
        try {
            await api.deletePurchaseOrder(poId);
            setPurchaseOrders(purchaseOrders.filter(po => po.id !== poId));
        } catch (error) {
            console.error("Failed to delete purchase order", error);
        }
    }
  };

  const handleUpdateStatus = async (poId: string, status: PurchaseOrder['status']) => {
    setActionLoadingId(poId);
    const poToUpdate = purchaseOrders.find(po => po.id === poId);
    if (!poToUpdate) return;
    try {
        await api.updatePurchaseOrder({ ...poToUpdate, status });
        fetchPOs();
    } catch (error) {
        console.error("Failed to update PO status", error);
    } finally {
        setActionLoadingId(null);
    }
  };
  
  const handleCompletePO = async (poId: string) => {
      if(!window.confirm('هل تريد تأكيد استلام هذا الأمر؟ سيتم تحديث المخزون وإنشاء قيد محاسبي.')) return;
      setActionLoadingId(poId);
      try {
          const result = await api.completePurchaseOrder(poId);
          if (result) {
              fetchPOs();
          } else {
              alert('فشل في استلام أمر الشراء. قد يكون بحالة غير صحيحة.');
          }
      } catch (error) {
          console.error("Failed to complete PO", error);
          alert('حدث خطأ أثناء استلام أمر الشراء.');
      } finally {
          setActionLoadingId(null);
      }
  };
  
  const filteredPOs = useMemo(() => 
    purchaseOrders.filter(po => {
        const searchMatch = (po.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (po.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (po.projectName || '').toLowerCase().includes(searchQuery.toLowerCase());
        const statusMatch = statusFilter === 'all' || po.status === statusFilter;
        return searchMatch && statusMatch;
    }), [purchaseOrders, searchQuery, statusFilter]
  );
  
  const totalAmount = useMemo(() => calculateTotal(formData.lines), [formData.lines]);
  const canCreate = hasPermission('purchaseOrders', 'create');
  const canEdit = hasPermission('purchaseOrders', 'edit');
  const canDelete = hasPermission('purchaseOrders', 'delete');

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">أوامر الشراء</h2>
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
            {canCreate && (
              <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <PlusCircle size={16} className="ml-2"/>
                إضافة أمر شراء
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse mb-6 border-t pt-4">
          <Filter size={16} className="text-gray-600"/>
          <span className="text-sm font-medium text-gray-700">تصفية:</span>
          <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>الكل</button>
          {Object.keys(statusMap).map(status => (
              <button key={status} onClick={() => setStatusFilter(status as PurchaseOrder['status'])} className={`px-3 py-1 text-sm rounded-full ${statusFilter === status ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{statusMap[status as PurchaseOrder['status']]}</button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">رقم الأمر</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المورد</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المشروع</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الإجمالي</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الحالة</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">القيد المحاسبي</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="mr-3 text-gray-500">جاري تحميل أوامر الشراء...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPOs.length > 0 ? filteredPOs.map(po => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b font-mono text-blue-600">{po.id}</td>
                  <td className="py-3 px-4 border-b">{po.supplierName}</td>
                  <td className="py-3 px-4 border-b">{po.projectName}</td>
                  <td className="py-3 px-4 border-b">﷼{calculateTotal(po.lines).toLocaleString()}</td>
                  <td className="py-3 px-4 border-b">{getStatusChip(po.status)}</td>
                  <td className="py-3 px-4 border-b font-mono">
                      {po.journalVoucherId ? (
                         <Link to="/journal-vouchers" className="text-blue-600 hover:underline flex items-center">
                            <Book size={14} className="ml-1" />
                            {po.journalVoucherId}
                        </Link>
                      ) : '-'}
                  </td>
                  <td className="py-3 px-4 border-b">
                     <div className="flex justify-center items-center space-x-1 space-x-reverse">
                        {actionLoadingId === po.id ? <Loader2 className="animate-spin text-blue-500" size={18}/> : <>
                          {canEdit && <button onClick={() => openEditModal(po)} className="text-gray-500 hover:text-gray-800 p-1" title="تعديل التفاصيل"><Edit size={18}/></button>}
                          
                          {po.status === 'draft' && canEdit && <button onClick={() => handleUpdateStatus(po.id, 'submitted')} className="text-blue-500 hover:text-blue-700 p-1" title="إرسال"><Send size={18} /></button>}
                          {po.status === 'submitted' && canEdit && <button onClick={() => handleUpdateStatus(po.id, 'approved')} className="text-green-500 hover:text-green-700 p-1" title="اعتماد"><CheckCircle size={18} /></button>}
                          {po.status === 'approved' && canEdit && hasPermission('inventory', 'edit') && hasPermission('journalVouchers', 'create') && 
                            <button onClick={() => handleCompletePO(po.id)} className="text-indigo-500 hover:text-indigo-700 p-1" title="استلام الأصناف"><Truck size={18} /></button>}
                          
                          {po.status === 'draft' && canDelete && <button onClick={() => handleDelete(po.id)} className="text-red-500 hover:text-red-700 p-1" title="حذف"><Trash2 size={18}/></button>}
                        </>}
                      </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500">
                    لا توجد أوامر شراء لعرضها.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPO ? "تعديل أمر شراء" : "إضافة أمر شراء جديد"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <input type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange} placeholder="اسم المورد" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                <input type="text" name="projectName" value={formData.projectName} onChange={handleInputChange} placeholder="اسم المشروع" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                  {Object.entries(statusMap).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                  ))}
                </select>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h4 className="text-md font-semibold mb-2">البنود</h4>
              {formData.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                    <input type="text" name="description" value={line.description} onChange={(e) => handleLineChange(index, e)} placeholder="الوصف" className="col-span-5 w-full text-sm p-1 border rounded-md" />
                    <input type="number" name="quantity" value={line.quantity} onChange={(e) => handleLineChange(index, e)} placeholder="الكمية" className="col-span-2 w-full text-sm p-1 border rounded-md" />
                    <input type="number" name="unitPrice" value={line.unitPrice} onChange={(e) => handleLineChange(index, e)} placeholder="السعر" className="col-span-2 w-full text-sm p-1 border rounded-md" />
                    <span className="col-span-2 text-sm text-center">﷼{(line.quantity * line.unitPrice).toLocaleString()}</span>
                    <button type="button" onClick={() => removeLine(index)} className="col-span-1 text-red-500 hover:text-red-700 disabled:opacity-50" disabled={formData.lines.length <= 1}>
                        <XCircle size={18} />
                    </button>
                </div>
              ))}
              <button type="button" onClick={addLine} className="mt-2 text-sm text-blue-600 hover:text-blue-800">+ إضافة بند</button>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-md flex justify-between items-center font-bold">
                <span>الإجمالي</span>
                <span>﷼{totalAmount.toLocaleString()}</span>
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

export default PurchaseOrders;