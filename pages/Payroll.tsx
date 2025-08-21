import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { PayrollRun, PayrollSlip, Employee, JournalVoucher, Account } from '../types';
import { PlusCircle, Edit, Trash2, Eye, CheckCircle, Book, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const getStatusChip = (status: PayrollRun['status']) => {
  const styles = {
    draft: 'bg-gray-100 text-gray-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
  };
  const text = {
    draft: 'مسودة',
    approved: 'معتمد',
    paid: 'مدفوع',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const calculateTotals = (slips: PayrollSlip[]) => {
    return (slips || []).reduce((acc, slip) => {
        const grossPay = slip.basicSalary + slip.allowances;
        acc.totalGross += grossPay;
        acc.totalDeductions += slip.deductions;
        acc.totalNet += slip.netPay;
        return acc;
    }, { totalGross: 0, totalDeductions: 0, totalNet: 0 });
};

const Payroll: React.FC = () => {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const { hasPermission } = useAuth();

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [runsData, employeesData, accountsData] = await Promise.all([
          api.getPayrollRuns(),
          api.getEmployees(),
          api.getAccounts()
        ]);
        setPayrollRuns(runsData);
        setEmployees(employeesData);
        setAccounts(accountsData);
      } catch (error) {
        console.error("Failed to load payroll data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [usingFirebase]);

  const initialFormState: Omit<PayrollRun, 'id'> = { period: '', payDate: '', status: 'draft', slips: [], journalVoucherId: null };
  const [formData, setFormData] = useState(initialFormState);

  const isModalOpen = modalMode !== null;
  const isReadOnly = modalMode === 'view' || (modalMode === 'edit' && !hasPermission('payroll', 'edit'));

  const openAddModal = () => {
    const activeEmployees = employees.filter(e => e.status === 'active');
    const newSlips: PayrollSlip[] = activeEmployees.map(emp => ({
      employeeId: emp.id,
      employeeName: emp.name,
      basicSalary: emp.salary,
      allowances: 0,
      deductions: 0,
      netPay: emp.salary,
    }));
    const today = new Date();
    const currentMonthYear = `${today.toLocaleString('ar', { month: 'long' })} ${today.getFullYear()}`;
    setFormData({ period: currentMonthYear, payDate: today.toISOString().split('T')[0], status: 'draft', slips: newSlips });
    setSelectedRun(null);
    setModalMode('add');
  };
  
  const openModal = (run: PayrollRun, mode: 'view' | 'edit') => {
    setSelectedRun(run);
    setFormData(run);
    setModalMode(mode);
  };
  
  const closeModal = () => {
    setModalMode(null);
    setSelectedRun(null);
    setFormData(initialFormState);
  };

  const handleSlipChange = (index: number, field: 'allowances' | 'deductions', value: string) => {
    const newSlips = [...formData.slips];
    const slipToUpdate = { ...newSlips[index] };
    const numericValue = Number(value) || 0;
    
    if (field === 'allowances') slipToUpdate.allowances = numericValue;
    else if (field === 'deductions') slipToUpdate.deductions = numericValue;

    slipToUpdate.netPay = slipToUpdate.basicSalary + slipToUpdate.allowances - slipToUpdate.deductions;
    
    newSlips[index] = slipToUpdate;
    setFormData(prev => ({ ...prev, slips: newSlips }));
  };

  const handleSave = async () => {
    try {
      if (selectedRun) {
        const updatedRun = await api.updatePayrollRun({ ...selectedRun, ...formData });
        if (updatedRun) {
            setPayrollRuns(prev => prev.map(r => r.id === updatedRun.id ? updatedRun : r));
        }
      } else {
        const newRun = await api.addPayrollRun(formData);
        setPayrollRuns(prev => [...prev, newRun]);
      }
      closeModal();
    } catch (error) {
      console.error("Failed to save payroll run", error);
    }
  };
  
  const handleDelete = async (runId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف مسير الرواتب هذا؟')) {
      try {
        await api.deletePayrollRun(runId);
        setPayrollRuns(payrollRuns.filter(r => r.id !== runId));
      } catch (error) {
        console.error("Failed to delete payroll run", error);
      }
    }
  };

  const handleApprove = async (runId: string) => {
    if (window.confirm('هل أنت متأكد من اعتماد مسير الرواتب هذا؟ سيتم إنشاء قيد يومية محاسبي تلقائياً.')) {
        const runToUpdate = payrollRuns.find(r => r.id === runId);
        if (!runToUpdate || runToUpdate.status !== 'draft') return;
        
        const salariesExpenseAcc = accounts.find(a => a.code === '511');
        const salariesPayableAcc = accounts.find(a => a.code === '213');
        const deductionsPayableAcc = accounts.find(a => a.code === '214');

        if (!salariesExpenseAcc || !salariesPayableAcc || !deductionsPayableAcc) {
            alert("خطأ: الحسابات المحاسبية اللازمة للرواتب (511, 213, 214) غير موجودة في دليل الحسابات. يرجى إضافتها أولاً.");
            return;
        }

        const { totalGross, totalDeductions, totalNet } = calculateTotals(runToUpdate.slips);

        const newJvData: Omit<JournalVoucher, 'id'> = {
            date: runToUpdate.payDate,
            description: `قيد استحقاق رواتب فترة ${runToUpdate.period}`,
            status: 'posted',
            lines: [
                { accountId: salariesExpenseAcc.id, description: 'إجمالي الرواتب والبدلات', debit: totalGross, credit: 0 },
                { accountId: deductionsPayableAcc.id, description: 'إجمالي الاستقطاعات', debit: 0, credit: totalDeductions },
                { accountId: salariesPayableAcc.id, description: 'صافي الرواتب المستحقة', debit: 0, credit: totalNet },
            ]
        };
        const createdJv = await api.addJournalVoucher(newJvData);
        if (!createdJv) {
            alert("فشل إنشاء قيد اليومية. لم يتم اعتماد مسير الرواتب.");
            return;
        }

        const updatedRunData: PayrollRun = { ...runToUpdate, status: 'approved', journalVoucherId: createdJv.id };
        await api.updatePayrollRun(updatedRunData);
        
        setPayrollRuns(payrollRuns.map(r => r.id === runId ? updatedRunData : r));
        alert(`تم اعتماد مسير الرواتب بنجاح. تم إنشاء قيد اليومية رقم ${createdJv.id}`);
    }
  };

  const modalTotals = useMemo(() => calculateTotals(formData.slips), [formData.slips]);

  const modalTitle = {
      add: 'إعداد مسير رواتب جديد',
      edit: 'تعديل مسير الرواتب',
      view: 'تفاصيل مسير الرواتب',
  };

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">إدارة الرواتب</h2>
          {hasPermission('payroll', 'create') && (
            <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              <PlusCircle size={16} className="ml-2" />
              إعداد مسير رواتب جديد
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">فترة الراتب</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">تاريخ الدفع</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">صافي المبلغ</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الحالة</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">قيد اليومية</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
                    </div>
                  </td>
                </tr>
              ) : payrollRuns.length > 0 ? payrollRuns.map((run) => {
                const totals = calculateTotals(run.slips);
                return (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b font-medium">{run.period}</td>
                    <td className="py-3 px-4 border-b">{run.payDate}</td>
                    <td className="py-3 px-4 border-b font-bold">﷼{totals.totalNet.toLocaleString()}</td>
                    <td className="py-3 px-4 border-b">{getStatusChip(run.status)}</td>
                    <td className="py-3 px-4 border-b font-mono">
                      {run.journalVoucherId ? (
                         <Link to="/journal-vouchers" className="text-blue-600 hover:underline flex items-center">
                            <Book size={14} className="ml-1" />
                            {run.journalVoucherId}
                        </Link>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 border-b">
                      <div className="flex justify-center items-center space-x-2 space-x-reverse">
                        <button onClick={() => openModal(run, 'view')} className="text-gray-500 hover:text-gray-700 p-1" title="عرض"><Eye size={18} /></button>
                        {run.status === 'draft' && hasPermission('payroll', 'edit') && <button onClick={() => openModal(run, 'edit')} className="text-blue-500 hover:text-blue-700 p-1" title="تعديل"><Edit size={18} /></button>}
                        {run.status === 'draft' && hasPermission('payroll', 'edit') && hasPermission('journalVouchers', 'create') && <button onClick={() => handleApprove(run.id)} className="text-green-500 hover:text-green-700 p-1" title="اعتماد"><CheckCircle size={18} /></button>}
                        {run.status === 'draft' && hasPermission('payroll', 'delete') && <button onClick={() => handleDelete(run.id)} className="text-red-500 hover:text-red-700 p-1" title="حذف"><Trash2 size={18} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    لا توجد مسيرات رواتب لعرضها.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalMode ? modalTitle[modalMode] : ''}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="period" value={formData.period} onChange={(e) => setFormData({...formData, period: e.target.value})} placeholder="فترة الراتب (مثال: يوليو 2024)" required className="w-full px-3 py-2 border border-gray-300 rounded-md" disabled={isReadOnly} />
              <input type="date" name="payDate" value={formData.payDate} onChange={(e) => setFormData({...formData, payDate: e.target.value})} required className="w-full px-3 py-2 border border-gray-300 rounded-md" disabled={isReadOnly}/>
            </div>

            <div className="border-t pt-4 mt-4 h-96 overflow-y-auto">
              <table className="min-w-full text-right text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="py-2 px-2 font-semibold text-gray-600">الموظف</th>
                    <th className="py-2 px-2 font-semibold text-gray-600">الراتب الأساسي</th>
                    <th className="py-2 px-2 font-semibold text-gray-600">البدلات</th>
                    <th className="py-2 px-2 font-semibold text-gray-600">الاستقطاعات</th>
                    <th className="py-2 px-2 font-semibold text-gray-600">صافي الراتب</th>
                  </tr>
                </thead>
                <tbody>
                  {(formData.slips || []).map((slip, index) => (
                    <tr key={slip.employeeId} className="border-b">
                      <td className="p-2">{slip.employeeName}</td>
                      <td className="p-2">﷼{slip.basicSalary.toLocaleString()}</td>
                      <td className="p-2"><input type="number" value={slip.allowances} onChange={e => handleSlipChange(index, 'allowances', e.target.value)} className="w-24 p-1 border rounded-md" disabled={isReadOnly} /></td>
                      <td className="p-2"><input type="number" value={slip.deductions} onChange={e => handleSlipChange(index, 'deductions', e.target.value)} className="w-24 p-1 border rounded-md" disabled={isReadOnly}/></td>
                      <td className="p-2 font-semibold">﷼{slip.netPay.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-md grid grid-cols-3 gap-4 font-bold text-center">
                <div><span className="font-normal text-gray-500 block">إجمالي المستحق</span> ﷼{modalTotals.totalGross.toLocaleString()}</div>
                <div><span className="font-normal text-gray-500 block">إجمالي الاستقطاعات</span> ﷼{modalTotals.totalDeductions.toLocaleString()}</div>
                <div><span className="font-normal text-gray-500 block">صافي المبلغ</span> ﷼{modalTotals.totalNet.toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إغلاق</button>
            {!isReadOnly && <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">حفظ</button>}
          </div>
        </form>
      </Modal>
    </>
  );
};

export default Payroll;