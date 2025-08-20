import React, { useState, useMemo, useEffect } from 'react';
import type { User } from '../types';
import { PlusCircle, Search, Edit, Trash2, Filter, Loader2, Image } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const roleMap: Record<User['role'], string> = {
  admin: 'مدير',
  accountant: 'محاسب',
  project_manager: 'مدير مشروع',
  viewer: 'مُشاهد'
};

const getStatusChip = (status: User['status']) => {
  return status === 'active' 
    ? <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">نشط</span>
    : <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded-full">غير نشط</span>;
};

const getRoleChip = (role: User['role']) => {
    const styles = {
        admin: 'bg-red-100 text-red-800',
        accountant: 'bg-blue-100 text-blue-800',
        project_manager: 'bg-yellow-100 text-yellow-800',
        viewer: 'bg-indigo-100 text-indigo-800',
    }
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[role]}`}>{roleMap[role]}</span>
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ role: 'all', status: 'all' });
  const { hasPermission } = useAuth();

  const usingFirebase = isFirebaseConfigured();
  const api = usingFirebase ? firebaseApi : localApi;

  useEffect(() => {
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoading(false);
        }
    };
    fetchUsers();
  }, [usingFirebase]);

  type FormData = Omit<User, 'id' | 'password'>;
  const initialFormState: FormData = { name: '', email: '', role: 'viewer', status: 'active', avatarUrl: '' };
  const [formData, setFormData] = useState<FormData>(initialFormState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    const { id, password, ...rest } = user;
    setFormData(rest);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSave = async () => {
    try {
        if (editingUser) {
            await api.updateUser({ ...editingUser, ...formData });
        } else {
            await api.addUser(formData);
        }
        const updatedUsers = await api.getUsers();
        setUsers(updatedUsers);
        closeModal();
    } catch (error) {
        console.error("Failed to save user", error);
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('هل أنت متأكد أنك تريد حذف هذا المستخدم؟')) {
      try {
        await api.deleteUser(userId);
        setUsers(users.filter(u => u.id !== userId));
      } catch (error) {
        console.error("Failed to delete user", error);
      }
    }
  };

  const filteredUsers = useMemo(() =>
    users.filter(user =>
      (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filters.role === 'all' || user.role === filters.role) &&
      (filters.status === 'all' || user.status === filters.status)
    ), [users, searchQuery, filters]
  );
  
  const canEdit = hasPermission('users', 'edit');
  const canDelete = hasPermission('users', 'delete');
  const showActionsColumn = canEdit || canDelete;

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h2>
          <div className="w-full md:w-auto flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2 md:space-x-reverse">
            <div className="relative w-full md:w-auto">
              <input
                type="text"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute inset-y-0 left-0 flex items-center pl-3"><Search className="w-5 h-5 text-gray-400" /></span>
            </div>
             <select value={filters.role} onChange={e => setFilters({...filters, role: e.target.value})} className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md bg-white text-sm">
                <option value="all">كل الأدوار</option>
                {Object.entries(roleMap).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
             <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md bg-white text-sm">
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            {hasPermission('users', 'create') && (
              <button onClick={openAddModal} className="w-full md:w-auto flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <PlusCircle size={16} className="ml-2" />
                إضافة مستخدم
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">المستخدم</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الدور</th>
                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">الحالة</th>
                {showActionsColumn && <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600 text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
            {isLoading ? (
                <tr>
                  <td colSpan={showActionsColumn ? 4 : 3} className="text-center py-10">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="mr-3 text-gray-500">جاري تحميل المستخدمين...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">
                    <div className="flex items-center">
                      <img src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`} alt={user.name} className="w-10 h-10 rounded-full ml-3 object-cover" />
                      <div>
                        <p className="font-semibold text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 border-b">{getRoleChip(user.role)}</td>
                  <td className="py-3 px-4 border-b">{getStatusChip(user.status)}</td>
                  {showActionsColumn &&
                    <td className="py-3 px-4 border-b">
                      <div className="flex justify-center items-center space-x-2 space-x-reverse">
                        {canEdit && <button onClick={() => openEditModal(user)} className="text-gray-500 hover:text-blue-700 p-1"><Edit size={18} /></button>}
                        {canDelete && <button onClick={() => handleDelete(user.id)} className="text-gray-500 hover:text-red-700 p-1"><Trash2 size={18} /></button>}
                      </div>
                    </td>
                  }
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingUser ? "تعديل مستخدم" : "إضافة مستخدم جديد"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
             <div>
              <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700 mb-1">رابط الصورة الرمزية</label>
              <input type="text" name="avatarUrl" id="avatarUrl" value={formData.avatarUrl || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                <p>ملاحظة: تتم إدارة كلمات المرور للمستخدمين الجدد عبر نظام Firebase Authentication مباشرة لضمان الأمان.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                <select name="role" id="role" value={formData.role} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                  {Object.entries(roleMap).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <select name="status" id="status" value={formData.status} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
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

export default Users;