import React, { useState, useMemo, useEffect } from 'react';
import type { Account } from '../types';
import { PlusCircle, Edit, Trash2, ChevronRight, ChevronDown, Search, Loader2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';
import { isFirebaseConfigured } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const buildTree = (accounts: Account[]): Account[] => {
  const accountMap = new Map(accounts.map(acc => [acc.id, { ...acc, children: [] as Account[] }]));
  const tree: Account[] = [];

  for (const account of accountMap.values()) {
    if (account.parentId && accountMap.has(account.parentId)) {
      accountMap.get(account.parentId)?.children.push(account);
    } else {
      tree.push(account);
    }
  }
  return tree;
};

const filterTree = (tree: Account[], query: string): Account[] => {
    if (!query) return tree;
    const lowerCaseQuery = query.toLowerCase();

    const recursiveFilter = (accounts: Account[]): Account[] => {
        return accounts.reduce<Account[]>((acc, account) => {
            const children = account.children ? recursiveFilter(account.children) : [];
            const isMatch = (account.name || '').toLowerCase().includes(lowerCaseQuery) || (account.code || '').includes(lowerCaseQuery);
            if (isMatch || children.length > 0) {
                acc.push({ ...account, children });
            }
            return acc;
        }, []);
    };
    return recursiveFilter(tree);
};


const flattenTreeForSelect = (accounts: Account[], level = 0) => {
  let result: { account: Account, level: number }[] = [];
  for (const account of accounts) {
    result.push({ account, level });
    if (account.children && account.children.length > 0) {
      result = result.concat(flattenTreeForSelect(account.children, level + 1));
    }
  }
  return result;
}

const accountTypeMap: Record<Account['type'], string> = {
  asset: 'أصول',
  liability: 'خصوم',
  equity: 'حقوق ملكية',
  revenue: 'إيرادات',
  expense: 'مصروفات',
};


const AccountRow: React.FC<{ 
  account: Account, 
  level: number, 
  onEdit: (account: Account) => void,
  onDelete: (accountId: string) => void,
  expandedRows: Set<string>,
  toggleRow: (accountId: string) => void,
  canEdit: boolean,
  canDelete: boolean,
}> = ({ account, level, onEdit, onDelete, expandedRows, toggleRow, canEdit, canDelete }) => {
  const isExpanded = expandedRows.has(account.id);
  const hasChildren = account.children && account.children.length > 0;

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="py-3 px-4 border-b" style={{ paddingRight: `${level * 24 + 16}px` }}>
          <div className="flex items-center">
            {hasChildren ? (
              <button onClick={() => toggleRow(account.id)} className="ml-2 text-gray-500">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : <span className="w-6 inline-block"></span>}
            <span className="font-mono">{account.code}</span>
          </div>
        </td>
        <td className="py-3 px-4 border-b">{account.name}</td>
        <td className="py-3 px-4 border-b">{accountTypeMap[account.type]}</td>
        {(canEdit || canDelete) &&
            <td className="py-3 px-4 border-b">
              <div className="flex justify-center items-center space-x-2 space-x-reverse">
                  {canEdit && <button onClick={() => onEdit(account)} className="text-blue-500 hover:text-blue-700 p-1" aria-label={`تعديل ${account.name}`}><Edit size={18}/></button>}
                  {canDelete && <button onClick={() => onDelete(account.id)} className="text-red-500 hover:text-red-700 p-1" aria-label={`حذف ${account.name}`}><Trash2 size={18}/></button>}
              </div>
            </td>
        }
      </tr>
      {isExpanded && hasChildren && account.children.map(child => (
        <AccountRow 
          key={child.id} 
          account={child} 
          level={level + 1} 
          onEdit={onEdit} 
          onDelete={onDelete} 
          expandedRows={expandedRows}
          toggleRow={toggleRow}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ))}
    </>
  );
};


const ChartOfAccounts: React.FC = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const { hasPermission } = useAuth();

    const usingFirebase = isFirebaseConfigured();
    const api = usingFirebase ? firebaseApi : localApi;

    useEffect(() => {
        const fetchAccounts = async () => {
            setIsLoading(true);
            try {
                const allAccounts = await api.getAccounts();
                setAccounts(allAccounts);
                setExpandedRows(new Set(allAccounts.filter(acc => acc.parentId === null).map(acc => acc.id)));
            } catch (error) {
                console.error("Failed to fetch accounts", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAccounts();
    }, [usingFirebase]);

    const initialFormData: Omit<Account, 'id'> = { code: '', name: '', type: 'asset', parentId: null };
    const [formData, setFormData] = useState(initialFormData);

    const accountTree = useMemo(() => {
        const fullTree = buildTree(accounts);
        return filterTree(fullTree, searchQuery);
    }, [accounts, searchQuery]);
    const accountOptions = useMemo(() => flattenTreeForSelect(buildTree(accounts)), [accounts]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({...prev, [name]: value === 'null' ? null : value }));
    };

    const openAddModal = () => {
        setEditingAccount(null);
        setFormData(initialFormData);
        setIsModalOpen(true);
    };

    const openEditModal = (account: Account) => {
        setEditingAccount(account);
        setFormData({
            code: account.code,
            name: account.name,
            type: account.type,
            parentId: account.parentId,
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingAccount(null);
    };

    const handleSave = async () => {
      try {
        if (editingAccount) {
          const updatedAccount = await api.updateAccount({ ...editingAccount, ...formData });
          if(updatedAccount) {
              setAccounts(accounts.map(a => a.id === updatedAccount.id ? updatedAccount : a));
          }
        } else {
          const newAccount = await api.addAccount(formData);
          setAccounts(prevAccounts => [...prevAccounts, newAccount]);
        }
        closeModal();
      } catch (error) {
        console.error("Failed to save account", error);
      }
    };

    const handleDelete = async (accountId: string) => {
      if (window.confirm('هل أنت متأكد من حذف هذا الحساب؟ سيتم حذف الحسابات الفرعية أيضًا.')) {
        try {
            await api.deleteAccount(accountId);
            const updatedAccounts = await api.getAccounts();
            setAccounts(updatedAccounts);
        } catch (error) {
            console.error("Failed to delete account", error);
        }
      }
    };
    
    const toggleRow = (accountId: string) => {
      setExpandedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(accountId)) {
          newSet.delete(accountId);
        } else {
          newSet.add(accountId);
        }
        return newSet;
      });
    };
    
    const canEdit = hasPermission('chartOfAccounts', 'edit');
    const canDelete = hasPermission('chartOfAccounts', 'delete');
    const showActionsColumn = canEdit || canDelete;

    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">دليل الحسابات</h2>
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="بحث بالرمز أو الاسم..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="w-5 h-5 text-gray-400" />
                            </span>
                        </div>
                        {hasPermission('chartOfAccounts', 'create') && (
                          <button 
                              onClick={openAddModal}
                              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                              <PlusCircle size={16} className="ml-2"/>
                              إضافة حساب جديد
                          </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white text-right">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600 w-1/3">رمز الحساب</th>
                                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">اسم الحساب</th>
                                <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">النوع</th>
                                {showActionsColumn && <th className="py-3 px-4 border-b text-sm font-semibold text-gray-600">إجراءات</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={showActionsColumn ? 4 : 3} className="text-center py-10">
                                        <div className="flex justify-center items-center">
                                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                                            <span className="mr-3 text-gray-500">جاري تحميل دليل الحسابات...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : accountTree.length > 0 ? accountTree.map(account => (
                                <AccountRow 
                                  key={account.id} 
                                  account={account} 
                                  level={0} 
                                  onEdit={openEditModal} 
                                  onDelete={handleDelete}
                                  expandedRows={expandedRows}
                                  toggleRow={toggleRow}
                                  canEdit={canEdit}
                                  canDelete={canDelete}
                                />
                            )) : (
                                <tr>
                                    <td colSpan={showActionsColumn ? 4 : 3} className="text-center py-10 text-gray-500">
                                        لا توجد حسابات لعرضها.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAccount ? "تعديل حساب" : "إضافة حساب جديد"}>
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">رمز الحساب</label>
                    <input type="text" name="code" id="code" value={formData.code} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" disabled={!!editingAccount} />
                  </div>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">اسم الحساب</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">نوع الحساب</label>
                    <select name="type" id="type" value={formData.type} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                      {Object.entries(accountTypeMap).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 mb-1">الحساب الأصلي</label>
                    <select name="parentId" id="parentId" value={formData.parentId || 'null'} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
                      <option value="null">-- حساب رئيسي --</option>
                      {accountOptions.map(({ account, level }) => (
                         <option key={account.id} value={account.id} disabled={editingAccount?.id === account.id}>
                          {''.padStart(level * 4, '\u00A0')} {account.code} - {account.name}
                        </option>
                      ))}
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

export default ChartOfAccounts;