

import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ApiKeyProvider } from './contexts/ApiKeyContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Clients from './pages/Clients';
import Suppliers from './pages/Suppliers';
import ChartOfAccounts from './pages/ChartOfAccounts';
import PurchaseOrders from './pages/PurchaseOrders';
import Invoices from './pages/Invoices';
import SupplierBills from './pages/SupplierBills';
import Inventory from './pages/Inventory';
import JournalVouchers from './pages/JournalVouchers';
import Reports from './pages/Reports';
import Employees from './pages/Employees';
import Payroll from './pages/Payroll';
import ChangeOrders from './pages/ChangeOrders';
import Custody from './pages/Custody';
import Vouchers from './pages/Vouchers';
import Diagnostics from './pages/Diagnostics';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Subcontracts from './pages/Subcontracts';
import SubcontractDetail from './pages/SubcontractDetail';
import Assets from './pages/Assets';
import Documents from './pages/Documents';
import BankReconciliation from './pages/BankReconciliation';
import DatabaseInspector from './pages/DatabaseInspector';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ApiKeyProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
                <Route path="/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/subcontracts" element={<Subcontracts />} />
                <Route path="/subcontracts/:id" element={<SubcontractDetail />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/supplier-bills" element={<SupplierBills />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/journal-vouchers" element={<JournalVouchers />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/users" element={<Users />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/change-orders" element={<ChangeOrders />} />
                <Route path="/custody" element={<Custody />} />
                <Route path="/vouchers" element={<Vouchers />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/bank-reconciliation" element={<BankReconciliation />} />
                <Route path="/diagnostics" element={<Diagnostics />} />
                <Route path="/database-inspector" element={<DatabaseInspector />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </HashRouter>
      </ApiKeyProvider>
    </AuthProvider>
  );
};

export default App;