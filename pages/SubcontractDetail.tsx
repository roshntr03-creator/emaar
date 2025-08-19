import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Subcontract, SubcontractorPayment } from '../types';
import { ArrowLeft, PlusCircle, Edit, Trash2, ClipboardSignature, Briefcase, Calendar, Percent, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Card from '../components/ui/Card';
import * as api from '../api';

const getStatusChip = (status: SubcontractorPayment['status'] | Subcontract['status']) => {
  const styles = {
    draft: 'bg-gray-100 text-gray-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    terminated: 'bg-red-100 text-red-800',
  };
  const text: Record<string, string> = {
    draft: 'مسودة', approved: 'معتمد', paid: 'مدفوع',
    active: 'نشط', completed: 'مكتمل', terminated: 'ملغي'
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>{text[status]}</span>;
};

const SubcontractDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const [subcontract, setSubcontract] = useState<Subcontract | null>(null);
  const [payments, setPayments] = useState<SubcontractorPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SubcontractorPayment | null>(null);

  useEffect(() => {
    const fetchData = async (subcontractId: string) => {
        setIsLoading(true);
        try {
            const [subData, payData] = await Promise.all([
                api.getSubcontractById(subcontractId),
                api.getSubcontractorPayments(subcontractId)
            ]);
            setSubcontract(subData || null);
            setPayments(payData);
        } catch (error) {
            console.error("Failed to load subcontract details", error);
        } finally {
            setIsLoading(false);
        }
    }
    if (id) {
      fetchData(id);
    }
  }, [id]);

  const initialFormState: Omit<SubcontractorPayment, 'id' | 'subcontractId' | 'paymentNumber'> = {
    date: new Date().toISOString().split('T')[0],
    workCompletedValue: 0,
    retentionAmount: 0,
    netPayment: 0,
    status: 'draft',
  };
  const [formData, setFormData] = useState(initialFormState);

  const financialSummary = useMemo(() => {
    if (!subcontract) return { totalPaid: 0, totalRetention: 0, balance: 0 };
    const totalPaid = payments.reduce((sum, p) => p.status === 'paid' ? sum + p.netPayment : sum, 0);
    const totalRetention = payments.reduce((sum, p) => sum + p.retentionAmount, 0);
    const balance = subcontract.contractAmount - totalPaid;
    return { totalPaid, totalRetention, balance };
  }, [subcontract, payments]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: name === 'workCompletedValue' ? Number(value) : value };

    if (name === 'workCompletedValue' && subcontract) {
        const retention = Number(value) * (subcontract.retentionPercentage / 100);
        newFormData.retentionAmount = retention;
        newFormData.netPayment = Number(value) - retention;
    }
    setFormData(newFormData);
  };

  const openAddModal = () => {
    setEditingPayment(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (payment: SubcontractorPayment) => {
    setEditingPayment(payment);
    setFormData(payment);
    setIsModalOpen(true);
  };
  
  const closeModal = () => setIsModalOpen(false);

  const handleSave = async () => {
    if (!id) return;
    try {
        if (editingPayment) {
          await api.updateSubcontractorPayment({ ...editingPayment, ...formData });
        } else {
          await api.addSubcontractorPayment({ ...formData, subcontractId: id });
        }
        const updatedPayments = await api.getSubcontractorPayments(id);
        setPayments(updatedPayments);
        closeModal();
    } catch (error) {
        console.error("Failed to save payment", error);
    }
  };
  
  const handleDelete = async (paymentId: string) => {
    if (!id) return;
    if (window.confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
        try {
            await api.deleteSubcontractorPayment(paymentId);
            setPayments(payments.filter(p => p.id !== paymentId));
        } catch (error) {
            console.error("Failed to delete payment", error);
        }
    }
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="mr-3 text-gray-600">جاري تحميل بيانات العقد...</p>
        </div>
    );
  }

  if (!subcontract) {
    return (
        <div className="text-center p-10">
            <h2 className="text-2xl font-bold text-red-600">العقد غير موجود</h2>
            <Link to="/subcontracts" className="text-blue-600 hover:underline mt-4 inline-block">العودة إلى قائمة العقود</Link>
        </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">
            عقد باطن: <span className="text-blue-600">{subcontract.subcontractorName}</span>
          </h1>
          <Link to="/subcontracts" className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border rounded-md hover:bg-gray-200">
            <ArrowLeft size={16} className="ml-2" /> العودة للعقود
          </Link>
        </div>

        <Card title="ملخص العقد المالي">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div><p className="text-sm text-gray-500">مبلغ العقد</p><p className="text-xl font-bold">﷼{subcontract.contractAmount.toLocaleString()}</p></div>
            <div><p className="text-sm text-gray-500">إجمالي المدفوع</p><p className="text-xl font-bold text-green-600">﷼{financialSummary.totalPaid.toLocaleString()}</p></div>
            <div><p className="text-sm text-gray-500">إجمالي الضمان المحتجز</p><p className="text-xl font-bold text-yellow-600">﷼{financialSummary.totalRetention.toLocaleString()}</p></div>
            <div><p className="text-sm text-gray-500">الرصيد المتبقي</p><p className="text-xl font-bold text-red-600">﷼{financialSummary.balance.toLocaleString()}</p></div>
          </div>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="تفاصيل العقد" className="lg:col-span-1">
                <div className="space-y-3 text-gray-700">
                    <div className="flex items-center"><Briefcase size={16} className="ml-2 text-gray-500" /> <strong>المشروع:</strong> <span className="mr-2">{subcontract.projectName}</span></div>
                    <div className="flex items-center"><Calendar size={16} className="ml-2 text-gray-500" /> <strong>تاريخ العقد:</strong> <span className="mr-2">{subcontract.date}</span></div>
                    <div className="flex items-center"><Percent size={16} className="ml-2 text-gray-500" /> <strong>نسبة الضمان:</strong> <span className="mr-2">{subcontract.retentionPercentage}%</span></div>
                    <div className="flex items-center"><strong>الحالة:</strong> <span className="mr-2">{getStatusChip(subcontract.status)}</span></div>
                    <div className="pt-2">
                        <h4 className="font-semibold mb-1">نطاق العمل:</h4>
                        <p className="text-sm bg-gray-50 p-3 rounded-md">{subcontract.scopeOfWork}</p>
                    </div>
                </div>
            </Card>

            <Card title="الدفعات" className="lg:col-span-2">
                <div className="flex justify-end mb-4">
                    <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        <PlusCircle size={16} className="ml-2" /> إضافة دفعة
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white text-right text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-2 border-b">الدفعة</th>
                                <th className="p-2 border-b">التاريخ</th>
                                <th className="p-2 border-b">قيمة العمل المنجز</th>
                                <th className="p-2 border-b">الضمان</th>
                                <th className="p-2 border-b">صافي الدفعة</th>
                                <th className="p-2 border-b">الحالة</th>
                                <th className="p-2 border-b">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.id}>
                                    <td className="p-2 border-b">{p.paymentNumber}</td>
                                    <td className="p-2 border-b">{p.date}</td>
                                    <td className="p-2 border-b">﷼{p.workCompletedValue.toLocaleString()}</td>
                                    <td className="p-2 border-b">﷼{p.retentionAmount.toLocaleString()}</td>
                                    <td className="p-2 border-b font-semibold">﷼{p.netPayment.toLocaleString()}</td>
                                    <td className="p-2 border-b">{getStatusChip(p.status)}</td>
                                    <td className="p-2 border-b">
                                        <div className="flex items-center space-x-1 space-x-reverse">
                                            <button onClick={() => openEditModal(p)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPayment ? 'تعديل دفعة' : 'إضافة دفعة جديدة'}>
        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">قيمة العمل المنجز لهذه الدفعة (﷼)</label>
                <input type="number" name="workCompletedValue" value={formData.workCompletedValue} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div className="p-3 bg-gray-50 rounded-md space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-600">الضمان ({subcontract.retentionPercentage}%):</span> <span className="font-medium">﷼{formData.retentionAmount.toLocaleString()}</span></div>
                <div className="flex justify-between text-base font-bold"><span className="text-gray-800">صافي الدفعة المستحقة:</span> <span>﷼{formData.netPayment.toLocaleString()}</span></div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <select name="status" value={formData.status} onChange={handleInputChange} required className="w-full px-3 py-2 border bg-white border-gray-300 rounded-md">
                  {Object.entries({draft:'مسودة', approved:'معتمد', paid:'مدفوع'}).map(([key, val]) => <option key={key} value={key}>{val}</option>)}
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

export default SubcontractDetail;
