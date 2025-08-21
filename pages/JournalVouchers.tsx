
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { JournalVoucher, JournalVoucherLine, Account } from '../types';
import { PlusCircle, Search, Edit, Trash2, XCircle, Filter, BrainCircuit, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useApiKey } from '../contexts/ApiKeyContext';

const getStatusChip = (status: 'posted' | 'draft') => {
  switch (status) {
    case 'posted':
      return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">مرحّل</span>;
    case 'draft':
      return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded-full">مسودة</span>;
  }
};


const JournalVouchers: React.FC = () => {
  const [vouchers, setVouchers] = useState<JournalVoucher[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<JournalVoucher | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JournalVoucher['status']>('all');
  const { hasPermission } = useAuth();
  const { apiKey } = useApiKey();
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;
  
  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [vouchersData, accountsData] = await Promise.all([
                api.getJournalVouchers(),
                api.getAccounts()
            ]);
            setVouchers(vouchersData);
            setAccounts(accountsData);
        } catch (error) {
            console.error("Failed to load data for journal vouchers", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [usingFirebase]);

  const emptyLine: JournalVoucherLine = { accountId: '', description: '', debit: 0, credit: 0 };
  const initialFormState: Omit<JournalVoucher, 'id'> = { date: '', description: '', status: 'draft', lines: [emptyLine, emptyLine]};
  const [formData, setFormData] = useState(initialFormState);

  const { totalDebit, totalCredit, isBalanced } = useMemo(() => {
    const totals = formData.lines.reduce((acc, line) => {
        acc.debit += Number(line.debit) || 0;
        acc.credit += Number(line.credit) || 0;
        return acc;
    }, { debit: 0, credit: 0 });
    return {
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        isBalanced: totals.debit === totals.credit && totals.debit > 0,
    };
  }, [formData.lines]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLineChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newLines = [...formData.lines];
    const line = { ...newLines[index], [name]: value };
    
    if (name === 'debit' && Number(value) > 0) line.credit = 0;
    if (name === 'credit' && Number(value) > 0) line.debit = 0;
    
    newLines[index] = line;
    setFormData({ ...formData, lines: newLines });
  };

  const addLine = () => {
    setFormData({ ...formData, lines: [...formData.lines, emptyLine] });
  };

  const removeLine = (index: number) => {
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: newLines });
  };
  
  const openAddModal = () => {
    setEditingVoucher(null);
    setFormData(initialFormState);
    setAiPrompt('');
    setAiError('');
    setIsModalOpen(true);
  };
  
  const openEditModal = (voucher: JournalVoucher) => {
    setEditingVoucher(voucher);
    setFormData({
        date: voucher.date,
        description: voucher.description,
        status: voucher.status,
        lines: voucher.lines,
    });
    setAiPrompt('');
    setAiError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVoucher(null);
  };

  const handleSave = async () => {
    if (!isBalanced) {
      alert('القيد غير متوازن. يجب أن يتساوى إجمالي المدين مع إجمالي الدائن.');
      return;
    }

    try {
        if (editingVoucher) {
            await api.updateJournalVoucher({ ...editingVoucher, ...formData });
        } else {
            await api.addJournalVoucher(formData);
        }
        const updatedVouchers = await api.getJournalVouchers();
        setVouchers(updatedVouchers);
        closeModal();
    } catch (error) {
        console.error("Failed to save journal voucher", error);
    }
  };

  const handleDelete = async (voucherId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا القيد؟')) {
        try {
            await api.deleteJournalVoucher(voucherId);
            setVouchers(vouchers.filter(v => v.id !== voucherId));
        } catch (error) {
            console.error("Failed to delete journal voucher", error);
        }
    }
  };
  
  const handleAiGenerate = async () => {
    if (!apiKey) {
        setAiError('الرجاء إعداد مفتاح Google AI API في صفحة الإعدادات.');
        return;
    }
    if (!aiPrompt) {
        setAiError('الرجاء إدخال وصف للعملية المالية.');
        return;
    }

    setIsAiLoading(true);
    setAiError('');

    const chartOfAccountsForAI = accounts.map(({ id, code, name, type }) => ({ id, code, name, type }));

    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
            أنت خبير محاسبة في شركة مقاولات سعودية. مهمتك هي تحليل الوصف التالي للعملية المالية وإنشاء قيد يومية متوازن.
            
            الوصف: "${aiPrompt}"

            استخدم دليل الحسابات التالي فقط لاختيار أرقام الحسابات الصحيحة. يجب أن يكون الناتج بصيغة JSON.
            دليل الحسابات: ${JSON.stringify(chartOfAccountsForAI, null, 2)}
        `;
        
        const responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    accountId: { type: Type.STRING },
                    description: { type: Type.STRING },
                    debit: { type: Type.NUMBER },
                    credit: { type: Type.NUMBER },
                },
                required: ['accountId', 'description', 'debit', 'credit'],
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        const generatedLines = JSON.parse(response.text) as JournalVoucherLine[];
        
        if (generatedLines && generatedLines.length > 0) {
            const totals = generatedLines.reduce((acc, line) => ({ debit: acc.debit + line.debit, credit: acc.credit + line.credit }), { debit: 0, credit: 0 });
            if (totals.debit !== totals.credit) {
                setAiError('فشل الذكاء الاصطناعي في إنشاء قيد متوازن. الرجاء المحاولة مرة أخرى أو تعديل الوصف.');
            } else {
                setFormData(prev => ({ ...prev, description: prev.description || aiPrompt, lines: generatedLines }));
            }
        } else {
            setAiError('لم يتمكن الذكاء الاصطناعي من فهم الطلب. حاول إعادة صياغة الوصف.');
        }

    } catch (error) {
        console.error("Error generating journal voucher:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
            setAiError("مفتاح API غير صالح. يرجى التحقق منه في صفحة الإعدادات.");
        } else {
            setAiError("حدث خطأ أثناء التواصل עם الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.");
        }
    } finally {
        setIsAiLoading(false);
    }
  };


  const filteredVouchers = useMemo(() => 
    vouchers.filter(v =>
      ((v.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.id || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || v.status === statusFilter)
    ), [vouchers, searchQuery, statusFilter]
  );
  
  const canEdit = hasPermission('journalVouchers', 'edit');
  const canDelete = hasPermission('journalVouchers', 'delete');
  const showActionsColumn = canEdit || canDelete;
  
  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">القيود اليومية</h2>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative">
                <input
                    type="text"
                    placeholder="بحث برقم القيد أو البيان..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute inset-y-0 left-0 flex items-center pl-3"><Search className="w-5 h-5 text-gray-400" /></span>
            </div>
            {hasPermission('journalVouchers', 'create') && (
              <button 
                  onClick={openAddModal}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <PlusCircle size={16} className="ml-2"/>
                إضافة قيد جديد
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse mb-6 border-t pt-4">
            <Filter size={16} className="text-gray-600"/>
            <span className="text-sm font-medium text-gray-700">تصفية:</span>
            <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>الكل</button>
            <button onClick={() => setStatusFilter('draft')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'draft' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>مسودة</button>
            <button onClick={() => setStatusFilter('posted')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'posted' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>مرحّل</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">رقم القيد</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">التاريخ</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">البيان</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجمالي مدين</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجمالي دائن</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الحالة</th>
                {showActionsColumn && <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={showActionsColumn ? 7 : 6} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="mr-3 text-gray-500">جاري تحميل القيود...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredVouchers.length > 0 ? filteredVouchers.map((voucher) => {
                const totals = (voucher.lines || []).reduce((acc, line) => {
                    acc.debit += line.debit;
                    acc.credit += line.credit;
                    return acc;
                }, {debit: 0, credit: 0});
                return (
                  <tr key={voucher.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b font-mono text-blue-600">{voucher.id}</td>
                    <td className="py-3 px-4 border-b">{voucher.date}</td>
                    <td className="py-3 px-4 border-b">{voucher.description}</td>
                    <td className="py-3 px-4 border-b">﷼{totals.debit.toLocaleString()}</td>
                    <td className="py-3 px-4 border-b">﷼{totals.credit.toLocaleString()}</td>
                    <td className="py-3 px-4 border-b">{getStatusChip(voucher.status)}</td>
                    {showActionsColumn &&
                      <td className="py-3 px-4 border-b">
                        <div className="flex justify-center items-center space-x-2 space-x-reverse">
                            {canEdit && <button onClick={() => openEditModal(voucher)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={18}/></button>}
                            {canDelete && <button onClick={() => handleDelete(voucher.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={18}/></button>}
                        </div>
                      </td>
                    }
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={showActionsColumn ? 7 : 6} className="text-center py-10 text-gray-500">
                    لا توجد قيود يومية لعرضها.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingVoucher ? "تعديل قيد يومية" : "إضافة قيد يومية جديد"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {!editingVoucher && hasPermission('journalVouchers', 'create') && (
              <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <label htmlFor="ai-prompt" className="flex items-center text-sm font-semibold text-gray-800 mb-2">
                    <BrainCircuit size={18} className="ml-2 text-blue-600" />
                    إنشاء باستخدام الذكاء الاصطناعي
                  </label>
                   <textarea
                        id="ai-prompt"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="مثال: دفع فاتورة كهرباء بقيمة 500 ريال نقداً"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                        type="button"
                        onClick={handleAiGenerate}
                        disabled={isAiLoading}
                        className="mt-2 w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                    >
                        {isAiLoading ? <Loader2 className="animate-spin" size={16} /> : "إنشاء القيد"}
                    </button>
                    {aiError && <p className="text-xs text-red-600 mt-2">{aiError}</p>}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                  <input type="date" name="date" id="date" value={formData.date} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                 <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select name="status" id="status" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as 'draft' | 'posted'})} required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                    <option value="draft">مسودة</option>
                    <option value="posted">مرحّل</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">البيان</label>
                  <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} required rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                </div>
            </div>

            <div className="overflow-x-auto -mx-6">
                <table className="min-w-full text-right">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="py-2 px-3 text-xs font-semibold text-gray-600">الحساب</th>
                    <th className="py-2 px-3 text-xs font-semibold text-gray-600">الوصف</th>
                    <th className="py-2 px-3 text-xs font-semibold text-gray-600">مدين</th>
                    <th className="py-2 px-3 text-xs font-semibold text-gray-600">دائن</th>
                    <th className="py-2 px-3 text-xs font-semibold text-gray-600"></th>
                    </tr>
                </thead>
                <tbody>
                    {formData.lines.map((line, index) => (
                    <tr key={index}>
                        <td className="p-1 w-1/3">
                        <select name="accountId" value={line.accountId} onChange={(e) => handleLineChange(index, e)} className="w-full text-sm p-1 border border-gray-300 rounded-md bg-white">
                            <option value="">اختر حساب...</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                        </select>
                        </td>
                        <td className="p-1 w-1/3">
                        <input type="text" name="description" value={line.description} onChange={(e) => handleLineChange(index, e)} className="w-full text-sm p-1 border border-gray-300 rounded-md" />
                        </td>
                        <td className="p-1">
                        <input type="number" name="debit" value={line.debit} onChange={(e) => handleLineChange(index, e)} className="w-full text-sm p-1 border border-gray-300 rounded-md" />
                        </td>
                        <td className="p-1">
                        <input type="number" name="credit" value={line.credit} onChange={(e) => handleLineChange(index, e)} className="w-full text-sm p-1 border border-gray-300 rounded-md" />
                        </td>
                        <td className="p-1 text-center">
                        <button type="button" onClick={() => removeLine(index)} className="text-red-500 hover:text-red-700"><XCircle size={18} /></button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>

            <button type="button" onClick={addLine} className="mt-2 text-sm text-blue-600 hover:text-blue-800">+ إضافة سطر</button>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-md flex justify-between items-center">
                <div>
                    <span className={`font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        {isBalanced ? 'القيد متوازن' : 'القيد غير متوازن'}
                    </span>
                    <span className="text-sm text-gray-500 mr-2">
                        الفرق: ﷼{Math.abs(totalDebit - totalCredit).toLocaleString()}
                    </span>
                </div>
                <div className="text-left">
                    <div className="text-sm"> <span className="text-gray-500">مدين:</span> ﷼{totalDebit.toLocaleString()}</div>
                    <div className="text-sm"> <span className="text-gray-500">دائن:</span> ﷼{totalCredit.toLocaleString()}</div>
                </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
                <button type="submit" disabled={!isBalanced} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed">حفظ</button>
            </div>
        </form>
      </Modal>
    </>
  );
};

export default JournalVouchers;