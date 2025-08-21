import React, { useState, useMemo, useEffect } from 'react';
import type { Employee } from '../types';
import { PlusCircle, Search, Edit, Trash2, Filter, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const getStatusChip = (status: Employee['status']) => {
  const styles = {
    active: 'bg-green-100 text-green-800',
    on_leave: 'bg-yellow-100 text-yellow-800',
    terminated: 'bg-red-100 text-red-800',
  };
  const text = {
    active: 'نشط',
    on_leave: 'إجازة',
    terminated: 'منتهية خدمته',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
};

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Employee['status']>('all');
  const { hasPermission } = useAuth();

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  useEffect(() => {
    const fetchEmployees = async () => {
        setIsLoading(true);
        try {
            const data = await api.getEmployees();
            setEmployees(data);
        } catch (error) {
            console.error("Failed to fetch employees", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchEmployees();
  }, [usingFirebase]);

  const initialFormState: Omit<Employee, 'id'> = { name: '', jobTitle: '', department: '', salary: 0, hireDate: '', phone: '', email: '', status: 'active' };
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'salary' ? Number(value) : value });
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData(employee);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleSave = async () => {
    try {
        if (editingEmployee) {
            const updatedEmployee = await api.updateEmployee({ ...editingEmployee, ...formData });
            if (updatedEmployee) {
                setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? updatedEmployee : e));
            }
        } else {
            const newEmployee = await api.addEmployee(formData);
            setEmployees(prev => [...prev, newEmployee]);
        }
        closeModal();
    } catch (error) {
        console.error("Failed to save employee", error);
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا الموظف؟')) {
      try {
        await api.deleteEmployee(employeeId);
        setEmployees(employees.filter(emp => emp.id !== employeeId));
      } catch (error) {
        console.error("Failed to delete employee", error);
      }
    }
  };

  const filteredEmployees = useMemo(() =>
    employees.filter(emp =>
      ((emp.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.jobTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.department || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || emp.status === statusFilter)
    ), [employees, searchQuery, statusFilter]
  );

  const canEdit = hasPermission('employees', 'edit');
  const canDelete = hasPermission('employees', 'delete');
  const showActionsColumn = canEdit || canDelete;

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">إدارة الموظفين</h2>
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
            {hasPermission('employees', 'create') && (
              <button onClick={openAddModal} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <PlusCircle size={16} className="ml-2" />
                إضافة موظف
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse mb-6 border-t pt-4">
            <Filter size={16} className="text-gray-600"/>
            <span className="text-sm font-medium text-gray-700">تصفية:</span>
            <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>الكل</button>
            <button onClick={() => setStatusFilter('active')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>نشط</button>
            <button onClick={() => setStatusFilter('on_leave')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'on_leave' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>إجازة</button>
            <button onClick={() => setStatusFilter('terminated')} className={`px-3 py-1 text-sm rounded-full ${statusFilter === 'terminated' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>منتهية خدمته</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الاسم</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المسمى الوظيفي</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">القسم</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الراتب</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">تاريخ التعيين</th>
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
                      <span className="mr-3 text-gray-500">جاري تحميل الموظفين...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length > 0 ? filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">{employee.name}</td>
                  <td className="py-3 px-4 border-b">{employee.jobTitle}</td>
                  <td className="py-3 px-4 border-b">{employee.department}</td>
                  <td className="py-3 px-4 border-b">﷼{employee.salary?.toLocaleString() ?? '0'}</td>
                  <td className="py-3 px-4 border-b">{employee.hireDate}</td>
                  <td className="py-3 px-4 border-b">{getStatusChip(employee.status)}</td>
                  {showActionsColumn && 
                    <td className="py-3 px-4 border-b">
                      <div className="flex justify-center items-center space-x-2 space-x-reverse">
                        {canEdit && <button onClick={() => openEditModal(employee)} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={18} /></button>}
                        {canDelete && <button onClick={() => handleDelete(employee.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={18} /></button>}
                      </div>
                    </td>
                  }
                </tr>
              )) : (
                <tr>
                  <td colSpan={showActionsColumn ? 7 : 6} className="text-center py-10 text-gray-500">
                    لا يوجد موظفون لعرضهم.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingEmployee ? "تعديل بيانات موظف" : "إضافة موظف جديد"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">المسمى الوظيفي</label>
                    <input type="text" name="jobTitle" id="jobTitle" value={formData.jobTitle} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                    <input type="text" name="department" id="department" value={formData.department} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                  <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                 <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                  <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">الراتب (﷼)</label>
                  <input type="number" name="salary" id="salary" value={formData.salary} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700 mb-1">تاريخ التعيين</label>
                    <input type="date" name="hireDate" id="hireDate" value={formData.hireDate} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
            </div>
             <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <select name="status" id="status" value={formData.status} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                  <option value="active">نشط</option>
                  <option value="on_leave">إجازة</option>
                  <option value="terminated">منتهية خدمته</option>
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

export default Employees;