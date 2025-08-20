export interface Project {
  id: string;
  name: string;
  client: string;
  budget: number;
  spent: number;
  status: 'active' | 'completed' | 'on_hold';
  startDate: string;
  endDate: string;
}

export interface Client {
  id:string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  activeProjects: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  service: string;
  email: string;
  phone: string;
}

export interface Invoice {
    id: string;
    project: string;
    clientName?: string; // Optional client name for reporting
    amount: number;
    status: 'paid' | 'unpaid' | 'overdue';
    issueDate: string;
    dueDate: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentId: string | null;
  children?: Account[];
}

export interface JournalVoucherLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalVoucher {
  id: string; // e.g., JV-2024-001
  date: string;
  description: string;
  lines: JournalVoucherLine[];
  status: 'posted' | 'draft';
}

export interface PurchaseOrderLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string; // e.g., PO-2024-001
  supplierName: string;
  projectName: string;
  date: string;
  lines: PurchaseOrderLine[];
  status: 'draft' | 'submitted' | 'approved' | 'completed' | 'cancelled';
  journalVoucherId?: string | null;
}

export interface InventoryItem {
  id: string; // e.g., MAT-001
  name: string;
  category: string;
  quantity: number;
  unit: string; // e.g., 'كيس', 'طن', 'متر'
  averageCost: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'accountant' | 'project_manager' | 'viewer';
  status: 'active' | 'inactive';
  avatarUrl?: string;
}

export interface Employee {
  id: string;
  name: string;
  jobTitle: string;
  department: string;
  salary: number;
  hireDate: string;
  phone: string;
  email: string;
  status: 'active' | 'on_leave' | 'terminated';
}

export interface PayrollSlip {
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
}

export interface PayrollRun {
  id: string; // e.g., PAY-2024-07
  period: string; // e.g., 'يوليو 2024'
  payDate: string;
  status: 'draft' | 'approved' | 'paid';
  slips: PayrollSlip[];
  journalVoucherId?: string | null;
}

export interface Voucher {
  id: string; // e.g., PV-2024-001 (Payment) or RV-2024-001 (Receipt)
  type: 'payment' | 'receipt';
  date: string;
  person: string; // The person/entity paid to or received from
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque';
  cashBankAccount: string; // ID of the cash/bank account affected
  correspondingAccount: string; // ID of the expense/revenue/other account
  status: 'draft' | 'approved';
  relatedInvoiceId?: string | null;
}

export interface ChangeOrder {
  id: string; // e.g., CO-001
  projectName: string; 
  date: string;
  description: string;
  amount: number; // Can be positive (addition) or negative (deduction)
  status: 'pending' | 'approved' | 'rejected';
}

export interface Custody {
  id: string; // e.g., CUST-001
  employeeId: string;
  employeeName: string;
  projectId?: string | null;
  projectName?: string | null;
  date: string;
  description: string;
  amount: number;
  settledAmount: number;
  status: 'open' | 'closed';
}

export interface BudgetLine {
  id: string;
  projectId: string;
  category: string;
  budgetItem: string;
  budgetAmount: number;
  actualAmount: number;
}

export interface SupplierBill {
  id: string; // e.g., BILL-SUP-001
  supplierName: string;
  projectName: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue';
  issueDate: string;
  dueDate: string;
}

export interface ProjectTask {
  id: string; // e.g., TASK-001
  projectId: string;
  name: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  progress: number; // 0-100
  type: 'task' | 'milestone' | 'project';
}

export interface Subcontract {
  id: string; // e.g., SUB-001
  projectId: string;
  projectName: string;
  subcontractorId: string; // From Supplier table
  subcontractorName: string;
  scopeOfWork: string;
  contractAmount: number;
  retentionPercentage: number; // e.g., 5 for 5%
  status: 'draft' | 'active' | 'completed' | 'terminated';
  date: string;
}

export interface SubcontractorPayment {
  id: string; // e.g., SP-001
  subcontractId: string;
  paymentNumber: number;
  date: string;
  workCompletedValue: number; // Value of work completed for this period
  retentionAmount: number; // Calculated from amount
  netPayment: number; // amount - retentionAmount
  status: 'draft' | 'approved' | 'paid';
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string; // dataURL for local, downloadURL for firebase
  storagePath?: string; // Only for firebase to enable deletion
  relatedId: string; // ID of the project, invoice, etc.
  relatedType: string; // e.g., 'project', 'invoice'
  uploadedAt: string;
}


// --- AI Features ---
export interface ProjectCostEstimate {
  estimatedTotalBudget: number;
  costBreakdown: {
    category: string;
    amount: number;
    description: string;
  }[];
  assumptions: string[];
  confidenceScore: number; // 0-100
  suggestedProjectName: string;
}

// --- Refactored Project Financials ---
export interface ProjectFinancialTransaction {
  id: string; // unique key for react list, can be `type-id`
  date: string;
  type: 'فاتورة عميل' | 'فاتورة مورد' | 'تسوية عهدة';
  description: string;
  income: number;
  expense: number;
  relatedDocumentId: string;
}

// --- AI Financial Analyst ---
export interface AiDataTable {
  headers: string[];
  rows: string[][];
}

export interface AiChartData {
  type: 'bar' | 'line';
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

export interface AiFinancialResponse {
  insight: string;
  table?: AiDataTable;
  chart?: AiChartData;
}

export interface FinancialOverviewData {
    projects: Pick<Project, 'name' | 'budget' | 'spent' | 'status' | 'startDate' | 'endDate'>[];
    invoices: Pick<Invoice, 'project' | 'amount' | 'status' | 'issueDate' | 'dueDate'>[];
    supplierBills: Pick<SupplierBill, 'projectName' | 'amount' | 'status' | 'issueDate' | 'dueDate'>[];
    payrollRuns: { period: string; payDate: string; status: PayrollRun['status']; totalPaid: number }[];
}

// --- Settings & Permissions ---

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface ModulePermissions {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
}

export type RolePermissions = {
  [module: string]: ModulePermissions;
};

export type AllRolesPermissions = {
  [role in User['role']]: RolePermissions;
};

export interface SettingsData {
  companyName: string;
  companyAddress: string;
  vatNumber: string;
  logoUrl: string;
  language: string;
  theme: string;
  dateFormat: string;
  currency: string;
  fiscalYearStart: string;
  invoicePrefix: string;
  overdueInvoiceAlerts: boolean;
  lowInventoryAlerts: boolean;
}

// --- Cloud & Data Management ---

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}