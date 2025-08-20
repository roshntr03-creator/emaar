

import React, { useState, useRef, useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { Search, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const pageTitles: { [key: string]: string } = {
  '/': 'لوحة التحكم',
  '/projects': 'المشاريع',
  '/projects/:id': 'تفاصيل المشروع',
  '/clients': 'العملاء',
  '/suppliers': 'الموردون',
  '/chart-of-accounts': 'دليل الحسابات',
  '/purchase-orders': 'أوامر الشراء',
  '/subcontracts': 'عقود الباطن',
  '/subcontracts/:id': 'تفاصيل عقد الباطن',
  '/invoices': 'فواتير العملاء',
  '/supplier-bills': 'فواتير الموردين',
  '/inventory': 'المخزون',
  '/journal-vouchers': 'القيود اليومية',
  '/reports': 'التقارير المالية',
  '/employees': 'الموظفون',
  '/users': 'المستخدمون',
  '/payroll': 'الرواتب',
  '/change-orders': 'تغيير الطلبات',
  '/custody': 'العهدة',
  '/vouchers': 'السندات',
  '/assets': 'إدارة الأصول',
  '/documents': 'مستودع المستندات',
  '/diagnostics': 'التشخيص',
  '/settings': 'الإعدادات',
};

const getPageTitle = (pathname: string): string => {
  for (const path in pageTitles) {
    if (matchPath(path, pathname)) {
      return pageTitles[path];
    }
  }
  return 'لوحة التحكم';
};


const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-gray-800">{pageTitle}</h2>
      </div>
      <div className="flex items-center">
        <div className="relative">
          <input
            type="text"
            placeholder="بحث..."
            className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-300 focus:border-blue-300"
          />
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="w-5 h-5 text-gray-400" />
          </span>
        </div>
        <button className="p-2 ml-4 text-gray-500 rounded-full hover:bg-gray-200 focus:outline-none focus:bg-gray-200">
          <Bell className="w-6 h-6" />
        </button>
        <div className="relative ml-6" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center focus:outline-none">
            <span className="mr-2 font-medium text-gray-700">{user?.name || 'مستخدم'}</span>
            <img
              className="w-10 h-10 rounded-full object-cover"
              src={user?.avatarUrl || "https://picsum.photos/100/100"}
              alt="User Avatar"
            />
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
              <button
                onClick={() => {
                  logout();
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4 ml-2" />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;