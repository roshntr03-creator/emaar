

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { SupplierBill } from '../types';
import { PlusCircle, Search, Edit, Trash2, Filter, Loader2, ImagePlus, BrainCircuit } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const getStatusChip = (status: 'paid' | 'unpaid' | 'overdue') => {
  const styles = {
    paid: 'bg-green-100 text-green-800',
    unpaid: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
  };
  const text = {
    paid: 'مدفوعة',
    unpaid: 'غير مدفوعة',
    overdue: 'متأخرة',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

const SupplierBills: React.FC = () => {
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<SupplierBill | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SupplierBill['status']>('all');
  const { hasPermission } = useAuth();
  
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiError, setAiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  const fetchBills = async () => {
      setIsLoading(true);
      try {
        const data = await api.getSupplierBills();
        setBills(data);
      } catch (error) {
        console.error("Failed to fetch supplier bills", error);
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchBills();
  }, [usingFirebase]);

  const initialFormState: Omit<SupplierBill, 'id'> = { supplierName: '', projectName: '', amount: 0, status: 'unpaid', issueDate: '', dueDate: '' };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'amount' ? Number(value) : value });
  };

  const openAddModal = () => {
    setEditingBill(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (bill: SupplierBill) => {
    setEditingBill(bill);
    setFormData(bill);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBill(null);
  };

  const handleSave = async () => {
    try {
      if (editingBill) {
        await api.updateSupplierBill({ ...editingBill, ...formData });
      } else {
        await api.addSupplierBill(formData);
      }
      fetchBills();
      closeModal();
    } catch (error) {
      console.error("Failed to save supplier bill", error);
    }
  };

  const handleDelete = async (billId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذه الفاتورة؟')) {
      try {
        await api.deleteSupplierBill(billId);
        setBills(bills.filter(b => b.id !== billId));
      } catch (error) {
        console.error("Failed to delete bill", error);
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAiScanning(true);
    setAiError('');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const imagePart = await fileToGenerativePart(file);
        
        const prompt = `أنت نظام OCR محاسبي متخصص في فواتير المقاولات. قم بتحليل صورة الفاتورة التالية واستخرج البيانات الأساسية منها.\n\n- استخرج اسم المورد.\n- استخرج تاريخ إصدار الفاتورة بصيغة YYYY-MM-DD.\n- استخرج المبلغ الإجمالي النهائي للفاتورة كرقم.\n- إذا كان تاريخ الاستحقاق موجودًا، استخرجه بصيغة YYYY-MM-DD.\n- تجاهل أي ضرائب أو خصومات، ركز فقط على المبلغ الإجمالي النهائي.\n\nيجب أن يكون الناتج بصيغة JSON حصراً.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                supplierName: { type: Type.STRING, description: "اسم المورد كما هو مكتوب في الفاتورة" },
                issueDate: { type: Type.STRING, description: "تاريخ إصدار الفاتورة بصيغة YYYY-MM-DD" },
                dueDate: { type: Type.STRING, description: "تاريخ استحقاق الفاتورة بصيغة YYYY-MM-DD. اتركه فارغاً إذا لم يكن موجوداً." },
                amount: { type: Type.NUMBER, description: "المبلغ الإجمالي النهائي للفاتورة" },
            },
            required: ["supplierName", "issueDate", "amount"]
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, {text: prompt}] },
            config: { responseMimeType: "application/json", responseSchema: responseSchema }
        });
        
        const extractedData = JSON.parse(response.text);

        setEditingBill(null);
        setFormData({
            ...initialFormState,
            supplierName: extractedData.supplierName || '',
            amount: extractedData.amount || 0,
            issueDate: extractedData.issueDate || '',
            dueDate: extractedData.dueDate || '',
        });
        setIsModalOpen(true);

    } catch (error) {
        console.error("Error analyzing invoice:", error);
        setAiError("عذراً، لم نتمكن من تحليل الفاتورة. يرجى المحاولة مرة أخرى أو إدخال البيانات يدوياً.");
    } finally {
        setIsAiScanning(false);
         if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const filteredBills = useMemo(() =>
    bills.filter(bill =>
      (((bill.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((bill.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()))) &&
      (statusFilter === 'all' || bill.status === statusFilter)
    ), [bills, searchQuery, statusFilter]);

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">فواتير الموردين</h2>
           <div className="flex items-center space-x-2 space-x-reverse">
            {aiError && <p className="text-sm text-red-600">{aiError}</p>}
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" disabled={isAiScanning}/>
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isAiScanning}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
            >
                {isAiScanning ? <Loader2 size={16} className="ml-2 animate-spin"/> : <BrainCircuit size={16} className="ml-2"/>}
                إضافة من صورة (AI)
            </button>
            <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <PlusCircle size={16} className="ml-2"/>
                إضافة يدوية
            </button>
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
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المورد</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المشروع</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المبلغ</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الحالة</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">تاريخ الاستحقاق</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                    <td colSpan={6} className="text-center py-10"><Loader2 className="mx-auto animate-spin" /></td>
                </tr>
              ) : filteredBills.map(bill => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">{bill.supplierName}</td>
                  <td className="py-3 px-4 border-b">{bill.projectName}</td>
                  <td className="py-3 px-4 border-b">﷼{bill.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 border-b">{getStatusChip(bill.status)}</td>
                  <td className="py-3 px-4 border-b">{bill.dueDate}</td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex justify-center items-center space-x-2 space-x-reverse">
                        {hasPermission('supplierBills', 'edit') && <button onClick={() => openEditModal(bill)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={18}/></button>}
                        {hasPermission('supplierBills', 'delete') && <button onClick={() => handleDelete(bill.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={18}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingBill ? "تعديل فاتورة مورد" : "إضافة فاتورة مورد جديدة"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <input type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange} placeholder="اسم المورد" required className="px-3 py-2 border border-gray-300 rounded-md" />
                <input type="text" name="projectName" value={formData.projectName} onChange={handleInputChange} placeholder="اسم المشروع" required className="px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="المبلغ" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <div className="grid grid-cols-2 gap-4">
                <input type="date" name="issueDate" value={formData.issueDate} onChange={handleInputChange} required className="px-3 py-2 border border-gray-300 rounded-md" />
                <input type="date" name="dueDate" value={formData.dueDate} onChange={handleInputChange} required className="px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                <option value="unpaid">غير مدفوعة</option>
                <option value="paid">مدفوعة</option>
                <option value="overdue">متأخرة</option>
            </select>
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

export default SupplierBills;