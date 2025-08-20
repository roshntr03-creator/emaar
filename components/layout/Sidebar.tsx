

import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    LayoutDashboard, Briefcase, Users, User, Building, FileText, ShoppingCart, Warehouse, Book, 
    Contact, DollarSign, Repeat, HandCoins, Receipt, HeartPulse, Settings, FileSpreadsheet, ClipboardSignature, FileArchive, Truck, FolderArchive
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label }) => {
  const activeClass = 'bg-blue-600 text-white';
  const inactiveClass = 'text-gray-300 hover:bg-gray-700 hover:text-white';
  
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center px-4 py-2 mt-2 text-sm font-medium rounded-md transition-colors duration-200 ${
          isActive ? activeClass : inactiveClass
        }`
      }
    >
      {icon}
      <span className="mr-3">{label}</span>
    </NavLink>
  );
};

const Sidebar: React.FC = () => {
  const { hasPermission } = useAuth();

  const allNavItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'لوحة التحكم', module: 'dashboard' }, // Assuming dashboard is a module
    { to: '/projects', icon: <Briefcase size={20} />, label: 'المشاريع', module: 'projects' },
    { to: '/clients', icon: <Users size={20} />, label: 'العملاء', module: 'clients' },
    { to: '/suppliers', icon: <Building size={20} />, label: 'الموردون', module: 'suppliers' },
    { to: '/invoices', icon: <FileText size={20} />, label: 'فواتير العملاء', module: 'invoices' },
    { to: '/supplier-bills', icon: <FileArchive size={20} />, label: 'فواتير الموردين', module: 'supplierBills' },
    { to: '/purchase-orders', icon: <ShoppingCart size={20} />, label: 'أوامر الشراء', module: 'purchaseOrders' },
    { to: '/subcontracts', icon: <ClipboardSignature size={20} />, label: 'عقود الباطن', module: 'subcontracts' },
    { to: '/assets', icon: <Truck size={20} />, label: 'إدارة الأصول', module: 'assets' },
    { to: '/documents', icon: <FolderArchive size={20} />, label: 'مستودع المستندات', module: 'documents' },
    { to: '/vouchers', icon: <Receipt size={20} />, label: 'السندات', module: 'vouchers' },
    { to: '/employees', icon: <Contact size={20} />, label: 'الموظفون', module: 'employees' },
    { to: '/payroll', icon: <DollarSign size={20} />, label: 'الرواتب', module: 'payroll' },
    { to: '/custody', icon: <HandCoins size={20} />, label: 'العهدة', module: 'custody' },
    { to: '/inventory', icon: <Warehouse size={20} />, label: 'المخزون', module: 'inventory' },
    { to: '/change-orders', icon: <Repeat size={20} />, label: 'تغيير الطلبات', module: 'changeOrders' },
    { to: '/journal-vouchers', icon: <Book size={20} />, label: 'القيود اليومية', module: 'journalVouchers' },
    { to: '/chart-of-accounts', icon: <Book size={20} />, label: 'دليل الحسابات', module: 'chartOfAccounts' },
    { to: '/reports', icon: <FileSpreadsheet size={20} />, label: 'التقارير', module: 'reports' },
    { to: '/users', icon: <User size={20} />, label: 'المستخدمون', module: 'users' },
    { to: '/diagnostics', icon: <HeartPulse size={20} />, label: 'التشخيص', module: 'diagnostics' },
    { to: '/settings', icon: <Settings size={20} />, label: 'الإعدادات', module: 'settings' },
  ];
  
  // Dashboard is a special case, almost everyone should see it.
  // We can handle its permission differently if needed. For now, let's assume 'view' is required.
  const visibleNavItems = allNavItems.filter(item => hasPermission(item.module, 'view'));

  return (
    <div className="flex flex-col w-64 bg-gray-800 text-white">
      <div className="flex items-center justify-center h-20 border-b border-gray-700">
        <User size={24} className="text-blue-400" />
        <h1 className="text-xl font-bold mr-2">محاسبة المقاولات</h1>
      </div>
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;