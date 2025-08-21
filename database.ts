import type { 
    Project, Client, Supplier, Invoice, Account, JournalVoucher, PurchaseOrder, InventoryItem, 
    User, Employee, PayrollRun, Voucher, ChangeOrder, Custody, BudgetLine, SupplierBill,
    ProjectTask, Subcontract, SubcontractorPayment, SettingsData, AllRolesPermissions, Attachment,
    ProjectFinancialTransaction, FinancialOverviewData, Asset, Document
} from './types';

// Define the shape of the database storage
interface DbData {
  projects: Project[];
  clients: Client[];
  suppliers: Supplier[];
  invoices: Invoice[];
  accounts: Account[];
  journalVouchers: JournalVoucher[];
  purchaseOrders: PurchaseOrder[];
  inventory: InventoryItem[];
  users: User[];
  employees: Employee[];
  payrollRuns: PayrollRun[];
  vouchers: Voucher[];
  changeOrders: ChangeOrder[];
  custodies: Custody[];
  budgetLines: BudgetLine[];
  supplierBills: SupplierBill[];
  tasks: ProjectTask[];
  subcontracts: Subcontract[];
  subcontractorPayments: SubcontractorPayment[];
  attachments: Attachment[];
  assets: Asset[];
  documents: Document[];
  settings: SettingsData;
  permissions: AllRolesPermissions;
}

const seedData: DbData = {
  projects: [
    { id: 'PROJ-001', name: 'بناء برج الرياض', client: 'شركة المملكة القابضة', budget: 5000000, spent: 2500000, status: 'active', startDate: '2023-01-15', endDate: '2025-01-15' },
    { id: 'PROJ-002', name: 'تشطيب فلل الياسمين', client: 'عبدالله السليمان', budget: 1200000, spent: 1250000, status: 'completed', startDate: '2022-06-01', endDate: '2023-05-30' },
    { id: 'PROJ-003', name: 'صيانة مول النخيل', client: 'مجموعة العثيم', budget: 750000, spent: 150000, status: 'on_hold', startDate: '2023-09-01', endDate: '2024-03-01' },
    { id: 'PROJ-004', name: 'مركز النور التجاري', client: 'شركة إعمار العقارية', budget: 12000000, spent: 4500000, status: 'active', startDate: '2023-03-01', endDate: '2025-08-31' },
    { id: 'PROJ-005', name: 'تجديد فندق الواحة', client: 'مجموعة فنادق عالمية', budget: 2500000, spent: 0, status: 'active', startDate: '2024-07-01', endDate: '2025-02-28' },
  ],
  clients: [
    { id: 'CUST-001', name: 'شركة المملكة القابضة', contactPerson: 'خالد العامر', email: 'k.amer@kingdom.sa', phone: '920012345', activeProjects: 1 },
    { id: 'CUST-002', name: 'عبدالله السليمان', contactPerson: 'عبدالله السليمان', email: 'a.sulaiman@example.com', phone: '0501234567', activeProjects: 0 },
    { id: 'CUST-003', name: 'مجموعة العثيم', contactPerson: 'سارة الحسن', email: 's.hassan@othaim.com', phone: '920054321', activeProjects: 1 },
    { id: 'CUST-004', name: 'شركة إعمار العقارية', contactPerson: 'فيصل الغامدي', email: 'f.ghamdi@emaar.com', phone: '0126543210', activeProjects: 1 },
    { id: 'CUST-005', name: 'مجموعة فنادق عالمية', contactPerson: 'جون سميث', email: 'j.smith@globalhotels.com', phone: '0112345678', activeProjects: 1 },
  ],
  suppliers: [
    { id: 'SUP-001', name: 'مصنع حديد الراجحي', contactPerson: 'محمد المصري', service: 'مواد بناء', email: 'sales@rajhisteel.com.sa', phone: '0114567890' },
    { id: 'SUP-002', name: 'شركة الكهرباء السعودية', contactPerson: 'قسم المشاريع', service: 'خدمات كهرباء', email: 'projects@se.com.sa', phone: '920001100' },
    { id: 'SUP-003', name: 'شركة الخزف السعودي', contactPerson: 'فهد العتيبي', service: 'مواد تشطيب', email: 'sales@saudiceramics.com', phone: '0119876543' },
    { id: 'SUP-004', name: 'مقاولات التكييف المتقدمة', contactPerson: 'علي الشمراني', service: 'مقاول باطن - تكييف', email: 'ali@ac-contracting.sa', phone: '0533219876' },
  ],
  invoices: [
    { id: 'INV-2024-001', project: 'بناء برج الرياض', clientName: 'شركة المملكة القابضة', amount: 500000, status: 'paid', issueDate: '2024-03-01', dueDate: '2024-03-31' },
    { id: 'INV-2024-002', project: 'بناء برج الرياض', clientName: 'شركة المملكة القابضة', amount: 750000, status: 'unpaid', issueDate: '2024-05-15', dueDate: '2024-06-15' },
    { id: 'INV-2024-003', project: 'مركز النور التجاري', clientName: 'شركة إعمار العقارية', amount: 1200000, status: 'unpaid', issueDate: '2024-06-01', dueDate: '2024-07-01' },
    { id: 'INV-2023-001', project: 'تشطيب فلل الياسمين', clientName: 'عبدالله السليمان', amount: 200000, status: 'overdue', issueDate: '2023-04-01', dueDate: '2023-05-01' },
  ],
  accounts: [
    { id: '1', code: '1', name: 'الأصول', type: 'asset', parentId: null },
    { id: '11', code: '11', name: 'الأصول المتداولة', type: 'asset', parentId: '1' },
    { id: '111', code: '111', name: 'النقد وما في حكمه', type: 'asset', parentId: '11' },
    { id: '1111', code: '1111', name: 'النقدية بالصندوق', type: 'asset', parentId: '111' },
    { id: '1112', code: '1112', name: 'النقدية بالبنوك', type: 'asset', parentId: '111' },
    { id: '112', code: '112', name: 'المخزون', type: 'asset', parentId: '11' },
    { id: '113', code: '113', name: 'العملاء - ذمم مدينة', type: 'asset', parentId: '11' },
    { id: '12', code: '12', name: 'الأصول الثابتة', type: 'asset', parentId: '1' },
    { id: '121', code: '121', name: 'المعدات والآليات', type: 'asset', parentId: '12' },
    { id: '122', code: '122', name: 'المركبات', type: 'asset', parentId: '12' },
    { id: '2', code: '2', name: 'الخصوم', type: 'liability', parentId: null },
    { id: '21', code: '21', name: 'الخصوم المتداولة', type: 'liability', parentId: '2' },
    { id: '211', code: '211', name: 'الموردون - ذمم دائنة', type: 'liability', parentId: '21' },
    { id: '212', code: '212', name: 'مقاولون من الباطن', type: 'liability', parentId: '21' },
    { id: '213', code: '213', name: 'رواتب مستحقة', type: 'liability', parentId: '21' },
    { id: '214', code: '214', name: 'استقطاعات مستحقة', type: 'liability', parentId: '21' },
    { id: '3', code: '3', name: 'حقوق الملكية', type: 'equity', parentId: null },
    { id: '31', code: '31', name: 'رأس المال', type: 'equity', parentId: '3' },
    { id: '4', code: '4', name: 'الإيرادات', type: 'revenue', parentId: null },
    { id: '41', code: '41', name: 'إيرادات المشاريع', type: 'revenue', parentId: '4' },
    { id: '5', code: '5', name: 'المصروفات', type: 'expense', parentId: null },
    { id: '51', code: '51', name: 'تكاليف المشاريع', type: 'expense', parentId: '5' },
    { id: '511', code: '511', name: 'تكلفة المواد المنصرفة', type: 'expense', parentId: '51' },
    { id: '512', code: '512', name: 'أجور عمال المشاريع', type: 'expense', parentId: '51' },
    { id: '513', code: '513', name: 'تكاليف مقاولي الباطن', type: 'expense', parentId: '51' },
    { id: '52', code: '52', name: 'مصروفات عمومية وإدارية', type: 'expense', parentId: '5' },
    { id: '521', code: '521', name: 'مصروف الرواتب الإدارية', type: 'expense', parentId: '52' },
    { id: '522', code: '522', name: 'مصروف كهرباء ومياه', type: 'expense', parentId: '52' },
    { id: '523', code: '523', name: 'مصروف وقود وصيانة مركبات', type: 'expense', parentId: '52' },
  ],
  journalVouchers: [
    { id: 'JV-2024-001', date: '2024-01-05', description: 'إثبات رأس المال عند تأسيس الشركة', lines: [ { accountId: '1112', description: 'إيداع بنكي', debit: 2000000, credit: 0 }, { accountId: '31', description: 'رأس المال', debit: 0, credit: 2000000 } ], status: 'posted' },
    { id: 'JV-2024-002', date: '2024-06-28', description: 'قيد استحقاق رواتب يونيو 2024', lines: [ { accountId: '521', description: 'رواتب إدارية', debit: 24500, credit: 0 }, { accountId: '512', description: 'أجور عمال مشاريع', debit: 12000, credit: 0 }, { accountId: '214', description: 'استقطاعات', debit: 0, credit: 750 }, { accountId: '213', description: 'رواتب مستحقة', debit: 0, credit: 35750 } ], status: 'posted' }
  ],
  purchaseOrders: [
    { id: 'PO-2024-001', supplierName: 'مصنع حديد الراجحي', projectName: 'بناء برج الرياض', date: '2024-06-10', lines: [{ description: 'حديد تسليح 16مم', quantity: 10, unitPrice: 2750 }], status: 'approved', journalVoucherId: null },
    { id: 'PO-2024-002', supplierName: 'شركة الخزف السعودي', projectName: 'مركز النور التجاري', date: '2024-07-01', lines: [{ description: 'أسمنت مقاوم', quantity: 200, unitPrice: 14.5 }, { description: 'بلوك أسمنتي 20سم', quantity: 1000, unitPrice: 2.4 }], status: 'draft', journalVoucherId: null },
    { id: 'PO-2024-003', supplierName: 'مصنع حديد الراجحي', projectName: 'مركز النور التجاري', date: '2024-05-20', lines: [{ description: 'حديد تسليح 18مم', quantity: 50, unitPrice: 2800 }], status: 'completed', journalVoucherId: 'JV-2024-003' }
  ],
  inventory: [
    { id: 'MAT-001', name: 'أسمنت مقاوم', category: 'مواد أساسية', quantity: 500, unit: 'كيس', averageCost: 15 },
    { id: 'MAT-002', name: 'حديد تسليح 16مم', category: 'حديد', quantity: 20, unit: 'طن', averageCost: 2800 },
    { id: 'MAT-003', name: 'بلوك أسمنتي 20سم', category: 'بلوك', quantity: 2500, unit: 'حبة', averageCost: 2.5 },
    { id: 'MAT-004', name: 'سيراميك أرضيات', category: 'تشطيبات', quantity: 1000, unit: 'متر مربع', averageCost: 45 },
    { id: 'MAT-005', name: 'كابلات كهربائية 16مم', category: 'كهرباء', quantity: 500, unit: 'متر', averageCost: 22 },
  ],
  users: [
      { id: 'USR-001', name: 'أحمد محمود', email: 'admin@company.com', role: 'admin', status: 'active', avatarUrl: 'https://i.pravatar.cc/150?u=USR-001' },
      { id: 'USR-002', name: 'فاطمة الزهراء', email: 'accountant@company.com', role: 'accountant', status: 'active', avatarUrl: 'https://i.pravatar.cc/150?u=USR-002' },
      { id: 'USR-003', name: 'علي حسن', email: 'pm@company.com', role: 'project_manager', status: 'active', avatarUrl: 'https://i.pravatar.cc/150?u=USR-003' },
      { id: 'USR-004', name: 'سارة عبدالله', email: 'viewer@company.com', role: 'viewer', status: 'inactive', avatarUrl: 'https://i.pravatar.cc/150?u=USR-004' }
  ],
  employees: [
    { id: 'EMP-001', name: 'سالم الغامدي', jobTitle: 'مهندس موقع', department: 'الهندسة', salary: 12000, hireDate: '2022-05-20', phone: '0551234567', email: 'salem@company.com', status: 'active' },
    { id: 'EMP-002', name: 'نورة الشهري', jobTitle: 'محاسبة مشاريع', department: 'المالية', salary: 9500, hireDate: '2023-01-10', phone: '0557654321', email: 'noura@company.com', status: 'active' },
    { id: 'EMP-003', name: 'يوسف التركي', jobTitle: 'مدير مشتريات', department: 'المشتريات', salary: 15000, hireDate: '2021-11-01', phone: '0531237890', email: 'yousef@company.com', status: 'on_leave' },
    { id: 'EMP-004', name: 'خالد المطيري', jobTitle: 'مدير مشروع', department: 'المشاريع', salary: 22000, hireDate: '2020-02-15', phone: '0509876543', email: 'khalid@company.com', status: 'active' },
  ],
  payrollRuns: [
    { id: 'PAY-2024-05', period: 'مايو 2024', payDate: '2024-05-28', status: 'paid', slips: [ { employeeId: 'EMP-001', employeeName: 'سالم الغامدي', basicSalary: 12000, allowances: 1500, deductions: 500, netPay: 13000 }, { employeeId: 'EMP-002', employeeName: 'نورة الشهري', basicSalary: 9500, allowances: 500, deductions: 250, netPay: 9750 }, { employeeId: 'EMP-004', employeeName: 'خالد المطيري', basicSalary: 22000, allowances: 2500, deductions: 1000, netPay: 23500 } ], journalVoucherId: 'JV-2024-004' },
    { id: 'PAY-2024-06', period: 'يونيو 2024', payDate: '2024-06-28', status: 'approved', slips: [ { employeeId: 'EMP-001', employeeName: 'سالم الغامدي', basicSalary: 12000, allowances: 1500, deductions: 500, netPay: 13000 }, { employeeId: 'EMP-002', employeeName: 'نورة الشهري', basicSalary: 9500, allowances: 500, deductions: 250, netPay: 9750 } ], journalVoucherId: 'JV-2024-002' }
  ],
  vouchers: [
    { id: 'PV-2024-001', type: 'payment', date: '2024-06-05', person: 'شركة الكهرباء السعودية', description: 'سداد فاتورة كهرباء للمكتب الرئيسي', amount: 4500, paymentMethod: 'bank_transfer', cashBankAccount: '1112', correspondingAccount: '522', status: 'approved' },
    { id: 'RV-2024-001', type: 'receipt', date: '2024-06-20', person: 'عبدالله السليمان', description: 'دفعة تحت الحساب لمشروع فلل الياسمين', amount: 100000, paymentMethod: 'cheque', cashBankAccount: '1112', correspondingAccount: '113', status: 'approved', relatedInvoiceId: 'INV-2023-001' },
    { id: 'PV-2024-002', type: 'payment', date: '2024-07-02', person: 'شركة الخزف السعودي', description: 'دفعة مقدمة لأمر الشراء PO-2024-002', amount: 5000, paymentMethod: 'bank_transfer', cashBankAccount: '1112', correspondingAccount: '211', status: 'draft' }
  ],
  changeOrders: [
    { id: 'CO-001', projectName: 'بناء برج الرياض', date: '2024-05-20', description: 'إضافة دور مواقف إضافي تحت الأرض', amount: 1250000, status: 'approved' },
    { id: 'CO-002', projectName: 'مركز النور التجاري', date: '2024-06-15', description: 'تغيير نوع الرخام للواجهات الرئيسية', amount: -150000, status: 'pending' }
  ],
  custodies: [
    { id: 'CUST-001', employeeId: 'EMP-001', employeeName: 'سالم الغامدي', projectId: 'PROJ-001', projectName: 'بناء برج الرياض', date: '2024-06-01', description: 'عهدة لشراء مواد بناء صغيرة وعاجلة', amount: 5000, settledAmount: 3500, status: 'open' },
    { id: 'CUST-002', employeeId: 'EMP-002', employeeName: 'نورة الشهري', projectId: null, projectName: null, date: '2024-05-10', description: 'عهدة لتغطية مصاريف سفر لحضور مؤتمر', amount: 7000, settledAmount: 7000, status: 'closed' },
    { id: 'CUST-003', employeeId: 'EMP-004', employeeName: 'خالد المطيري', projectId: 'PROJ-004', projectName: 'مركز النور التجاري', date: '2024-07-01', description: 'عهدة مصاريف نثرية للمشروع', amount: 10000, settledAmount: 0, status: 'open' },
  ],
  budgetLines: [
    { id: 'BL-001', projectId: 'PROJ-001', category: 'مواد بناء', budgetItem: 'حديد تسليح', budgetAmount: 1000000, actualAmount: 850000 },
    { id: 'BL-002', projectId: 'PROJ-001', category: 'مواد بناء', budgetItem: 'خرسانة جاهزة', budgetAmount: 1500000, actualAmount: 1600000 },
    { id: 'BL-003', projectId: 'PROJ-001', category: 'أجور العمال', budgetItem: 'رواتب العمال والفنيين', budgetAmount: 2000000, actualAmount: 50000 },
    { id: 'BL-004', projectId: 'PROJ-004', category: 'مقاولين بالباطن', budgetItem: 'أعمال التكييف', budgetAmount: 1500000, actualAmount: 0 },
    { id: 'BL-005', projectId: 'PROJ-004', category: 'مقاولين بالباطن', budgetItem: 'أعمال الكهرباء', budgetAmount: 1200000, actualAmount: 300000 },
  ],
  supplierBills: [
    { id: 'BILL-001', supplierName: 'مصنع حديد الراجحي', projectName: 'بناء برج الرياض', amount: 150000, status: 'paid', issueDate: '2024-02-10', dueDate: '2024-03-10'},
    { id: 'BILL-002', supplierName: 'شركة الخزف السعودي', projectName: 'تشطيب فلل الياسمين', amount: 85000, status: 'overdue', issueDate: '2023-03-15', dueDate: '2023-04-15'},
    { id: 'BILL-003', supplierName: 'مقاولات التكييف المتقدمة', projectName: 'مركز النور التجاري', amount: 350000, status: 'unpaid', issueDate: '2024-06-25', dueDate: '2024-07-25'},
  ],
  tasks: [
    { id: 'TASK-001', projectId: 'PROJ-001', name: 'أعمال الحفر والأساسات', start: '2023-01-15', end: '2023-03-15', progress: 100, type: 'task' },
    { id: 'TASK-002', projectId: 'PROJ-001', name: 'بناء الهيكل الخرساني', start: '2023-03-16', end: '2023-09-30', progress: 75, type: 'task' },
    { id: 'TASK-003', projectId: 'PROJ-001', name: 'أعمال التشطيبات الخارجية', start: '2023-10-01', end: '2024-02-28', progress: 25, type: 'task' },
    { id: 'TASK-004', projectId: 'PROJ-004', name: 'مرحلة التصميم والترخيص', start: '2023-03-01', end: '2023-05-30', progress: 100, type: 'task' },
    { id: 'TASK-005', projectId: 'PROJ-004', name: 'أعمال الهيكل الإنشائي', start: '2023-06-01', end: '2024-04-30', progress: 60, type: 'task' },
    { id: 'TASK-006', projectId: 'PROJ-004', name: 'تسليم الهيكل الإنشائي', start: '2024-04-30', end: '2024-04-30', progress: 0, type: 'milestone' },
  ],
  subcontracts: [
    { id: 'SUB-001', projectId: 'PROJ-001', projectName: 'بناء برج الرياض', subcontractorId: 'SUP-001', subcontractorName: 'مصنع حديد الراجحي', scopeOfWork: 'توريد وتركيب كامل الهيكل الحديدي للمشروع.', contractAmount: 1200000, retentionPercentage: 5, status: 'active', date: '2023-02-20' },
    { id: 'SUB-002', projectId: 'PROJ-002', projectName: 'تشطيب فلل الياسمين', subcontractorId: 'SUP-002', subcontractorName: 'شركة الكهرباء السعودية', scopeOfWork: 'جميع أعمال التمديدات الكهربائية والإنارة الداخلية والخارجية.', contractAmount: 250000, retentionPercentage: 10, status: 'completed', date: '2022-07-10' },
    { id: 'SUB-003', projectId: 'PROJ-004', projectName: 'مركز النور التجاري', subcontractorId: 'SUP-004', subcontractorName: 'مقاولات التكييف المتقدمة', scopeOfWork: 'توريد وتركيب نظام التكييف المركزي بالكامل.', contractAmount: 1500000, retentionPercentage: 5, status: 'draft', date: '2024-06-15' },
  ],
  subcontractorPayments: [
    { id: 'SP-001', subcontractId: 'SUB-001', paymentNumber: 1, date: '2023-05-15', workCompletedValue: 300000, retentionAmount: 15000, netPayment: 285000, status: 'paid' },
    { id: 'SP-002', subcontractId: 'SUB-001', paymentNumber: 2, date: '2023-08-20', workCompletedValue: 400000, retentionAmount: 20000, netPayment: 380000, status: 'paid' },
    { id: 'SP-003', subcontractId: 'SUB-001', paymentNumber: 3, date: '2023-11-25', workCompletedValue: 250000, retentionAmount: 12500, netPayment: 237500, status: 'approved' },
    { id: 'SP-004', subcontractId: 'SUB-002', paymentNumber: 1, date: '2022-10-01', workCompletedValue: 250000, retentionAmount: 25000, netPayment: 225000, status: 'paid' },
  ],
  attachments: [],
  assets: [
    { id: 'ASSET-001', assetCode: 'EQ-001', name: 'حفارة كاتربيلر 320D', category: 'معدات ثقيلة', purchaseDate: '2022-08-15', purchaseCost: 450000, currentValue: 380000, status: 'in_use', assignedProjectName: 'بناء برج الرياض', lastMaintenanceDate: '2024-05-20', nextMaintenanceDate: '2024-11-20'},
    { id: 'ASSET-002', assetCode: 'VEH-001', name: 'شاحنة مرسيدس أكتروس', category: 'مركبات', purchaseDate: '2021-03-10', purchaseCost: 650000, currentValue: 500000, status: 'available', assignedProjectName: null, lastMaintenanceDate: '2024-06-01', nextMaintenanceDate: '2024-12-01'},
    { id: 'ASSET-003', assetCode: 'EQ-002', name: 'رافعة برجية Liebherr', category: 'معدات ثقيلة', purchaseDate: '2023-01-20', purchaseCost: 1200000, currentValue: 1100000, status: 'under_maintenance', assignedProjectName: 'مركز النور التجاري', lastMaintenanceDate: '2024-07-15', nextMaintenanceDate: '2025-01-15'},
    { id: 'ASSET-004', assetCode: 'VEH-002', name: 'تويوتا هايلكس', category: 'مركبات', purchaseDate: '2023-10-05', purchaseCost: 130000, currentValue: 120000, status: 'in_use', assignedProjectName: 'مركز النور التجاري', lastMaintenanceDate: null, nextMaintenanceDate: '2024-10-01'},
  ],
  documents: [
    { id: 'DOC-001', title: 'عقد مشروع برج الرياض', description: 'العقد الأصلي الموقع مع شركة المملكة القابضة', category: 'عقد', tags: ['عقد رئيسي', 'برج الرياض'], linkedEntities: [{ type: 'project', id: 'PROJ-001', name: 'بناء برج الرياض' }, { type: 'client', id: 'CUST-001', name: 'شركة المملكة القابضة' }], fileName: 'riyadh-tower-contract.pdf', fileType: 'application/pdf', fileSize: 1234567, url: '#', uploadedAt: '2023-01-10T10:00:00Z' },
    { id: 'DOC-002', title: 'مخطط الواجهات المعمارية', description: 'المخططات المعتمدة للواجهات من الاستشاري', category: 'مخطط هندسي', tags: ['معماري', 'واجهات', 'PROJ-001'], linkedEntities: [{ type: 'project', id: 'PROJ-001', name: 'بناء برج الرياض' }], fileName: 'facade-drawings.dwg', fileType: 'image/vnd.dwg', fileSize: 5678901, url: '#', uploadedAt: '2023-02-22T14:30:00Z' },
    { id: 'DOC-003', title: 'فاتورة مورد - الخزف السعودي', description: 'فاتورة شراء سيراميك لمشروع فلل الياسمين', category: 'فاتورة', tags: ['مشتريات', 'تشطيبات'], linkedEntities: [{ type: 'project', id: 'PROJ-002', name: 'تشطيب فلل الياسمين' }, { type: 'supplier', id: 'SUP-003', name: 'شركة الخزف السعودي' }], fileName: 'saudi-ceramics-bill.jpg', fileType: 'image/jpeg', fileSize: 876543, url: '#', uploadedAt: '2022-09-15T11:45:00Z' }
  ],
  settings: {
    companyName: 'شركة المقاولات الحديثة',
    companyAddress: '1234 طريق الملك فهد، الرياض، المملكة العربية السعودية',
    vatNumber: '300123456700003',
    logoUrl: '',
    language: 'ar',
    theme: 'light',
    dateFormat: 'DD/MM/YYYY',
    currency: 'SAR',
    fiscalYearStart: '01-01',
    invoicePrefix: 'INV-',
    overdueInvoiceAlerts: true,
    lowInventoryAlerts: false,
  },
  permissions: {
    admin: {
        clients: { view: true, create: true, edit: true, delete: true }, suppliers: { view: true, create: true, edit: true, delete: true }, projects: { view: true, create: true, edit: true, delete: true }, chartOfAccounts: { view: true, create: true, edit: true, delete: true }, purchaseOrders: { view: true, create: true, edit: true, delete: true }, invoices: { view: true, create: true, edit: true, delete: true }, supplierBills: { view: true, create: true, edit: true, delete: true }, inventory: { view: true, create: true, edit: true, delete: true }, journalVouchers: { view: true, create: true, edit: true, delete: true }, reports: { view: true }, employees: { view: true, create: true, edit: true, delete: true }, users: { view: true, create: true, edit: true, delete: true }, payroll: { view: true, create: true, edit: true, delete: true }, changeOrders: { view: true, create: true, edit: true, delete: true }, custody: { view: true, create: true, edit: true, delete: true }, vouchers: { view: true, create: true, edit: true, delete: true }, diagnostics: { view: true }, settings: { view: true, edit: true }, assets: { view: true, create: true, edit: true, delete: true }, documents: { view: true, create: true, edit: true, delete: true }, subcontracts: { view: true, create: true, edit: true, delete: true }
    },
    accountant: {
        clients: { view: true, create: true, edit: true, delete: true }, suppliers: { view: true, create: true, edit: true, delete: true }, projects: { view: true, create: false, edit: false, delete: false }, chartOfAccounts: { view: true, create: true, edit: true, delete: true }, purchaseOrders: { view: true, create: true, edit: true, delete: false }, invoices: { view: true, create: true, edit: true, delete: false }, supplierBills: { view: true, create: true, edit: true, delete: false }, inventory: { view: true, create: true, edit: true, delete: true }, journalVouchers: { view: true, create: true, edit: true, delete: true }, reports: { view: true }, employees: { view: true, create: false, edit: false, delete: false }, users: { view: true, create: false, edit: false, delete: false }, payroll: { view: true, create: true, edit: true, delete: false }, changeOrders: { view: true, create: true, edit: true, delete: false }, custody: { view: true, create: true, edit: true, delete: true }, vouchers: { view: true, create: true, edit: true, delete: true }, diagnostics: { view: true }, settings: { view: true, edit: true }, assets: { view: true, create: true, edit: true, delete: true }, documents: { view: true, create: true, edit: true, delete: true }, subcontracts: { view: true, create: true, edit: true, delete: false }
    },
    project_manager: {
        clients: { view: true, create: false, edit: false, delete: false }, suppliers: { view: true, create: false, edit: false, delete: false }, projects: { view: true, create: true, edit: true, delete: false }, chartOfAccounts: { view: true, create: false, edit: false, delete: false }, purchaseOrders: { view: true, create: true, edit: true, delete: false }, invoices: { view: true, create: false, edit: false, delete: false }, supplierBills: { view: true, create: false, edit: false, delete: false }, inventory: { view: true, create: false, edit: false, delete: false }, journalVouchers: { view: false, create: false, edit: false, delete: false }, reports: { view: true }, employees: { view: true, create: false, edit: false, delete: false }, users: { view: true, create: false, edit: false, delete: false }, payroll: { view: false, create: false, edit: false, delete: false }, changeOrders: { view: true, create: true, edit: true, delete: false }, custody: { view: true, create: true, edit: true, delete: false }, vouchers: { view: false, create: false, edit: false, delete: false }, diagnostics: { view: true }, settings: { view: true, edit: false }, assets: { view: true, create: false, edit: false, delete: false }, documents: { view: true, create: true, edit: true, delete: false }, subcontracts: { view: true, create: true, edit: true, delete: false }
    },
    viewer: {
        clients: { view: true, create: false, edit: false, delete: false }, suppliers: { view: true, create: false, edit: false, delete: false }, projects: { view: true, create: false, edit: false, delete: false }, chartOfAccounts: { view: true, create: false, edit: false, delete: false }, purchaseOrders: { view: true, create: false, edit: false, delete: false }, invoices: { view: true, create: false, edit: false, delete: false }, supplierBills: { view: true, create: false, edit: false, delete: false }, inventory: { view: true, create: false, edit: false, delete: false }, journalVouchers: { view: true, create: false, edit: false, delete: false }, reports: { view: true }, employees: { view: true, create: false, edit: false, delete: false }, users: { view: false, create: false, edit: false, delete: false }, payroll: { view: true, create: false, edit: false, delete: false }, changeOrders: { view: true, create: false, edit: false, delete: false }, custody: { view: true, create: false, edit: false, delete: false }, vouchers: { view: true, create: false, edit: false, delete: false }, diagnostics: { view: false }, settings: { view: false, edit: false }, assets: { view: true, create: false, edit: false, delete: false }, documents: { view: true, create: false, edit: false, delete: false }, subcontracts: { view: true, create: false, edit: false, delete: false }
    },
  },
};

class Database {
  private _data: DbData = {
    projects: [], clients: [], suppliers: [], invoices: [], accounts: [], journalVouchers: [],
    purchaseOrders: [], inventory: [], users: [], employees: [], payrollRuns: [], vouchers: [],
    changeOrders: [], custodies: [], budgetLines: [], supplierBills: [], tasks: [],
    subcontracts: [], subcontractorPayments: [], attachments: [], assets: [], documents: [],
    settings: {} as SettingsData, permissions: {} as AllRolesPermissions
  };
  private storageKey = 'accounting_app_db_v2';

  public initialize() {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Merge with a deep copy of seed data to ensure all keys are present.
        // This prevents errors if the stored data is from an older schema.
        this._data = { ...JSON.parse(JSON.stringify(seedData)), ...parsedData };
      } else {
        this._data = JSON.parse(JSON.stringify(seedData)); // Deep copy for new DB
      }
      // Always save back, to upgrade the stored schema if necessary
      this._save(); 
    } catch (error) {
      console.error("Error initializing database, falling back to seed data:", error);
      this._data = JSON.parse(JSON.stringify(seedData));
      this._save();
    }
  }

  private _save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this._data));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }

  public clearDatabase() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error("Error clearing database from localStorage:", error);
    }
  }

  private _generateId(basePrefix: string, list: { id: string }[], options: { useYear?: boolean } = {}): string {
    const year = new Date().getFullYear();
    const prefix = options.useYear ? `${basePrefix}-${year}-` : `${basePrefix}-`;
    
    const maxNum = list
        .filter(item => item.id.startsWith(prefix))
        .reduce((max, item) => {
            const numPart = item.id.substring(prefix.length);
            const num = parseInt(numPart, 10);
            return isNaN(num) ? max : Math.max(max, num);
        }, 0);
    
    return `${prefix}${(maxNum + 1).toString().padStart(3, '0')}`;
  }
  
  private _readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
  };

  // --- Generic CRUD Methods ---
  private _getAll<T extends keyof DbData>(key: T): DbData[T] {
    return this._data[key];
  }

  private _add<T extends keyof DbData>(key: T, item: any, idPrefix: string, idOptions: { useYear?: boolean } = {}): any {
    const newId = this._generateId(idPrefix, this._data[key] as any[], idOptions);
    const newItem = { ...item, id: newId };
    (this._data[key] as any[]).push(newItem);
    this._save();
    return newItem;
  }

  private _update<T extends keyof DbData>(key: T, updatedItem: any): any {
    const items = this._data[key] as any[];
    const index = items.findIndex(i => i.id === updatedItem.id);
    if (index !== -1) {
      items[index] = updatedItem;
      this._save();
      return updatedItem;
    }
    return null;
  }

  private _delete<T extends keyof DbData>(key: T, id: string): void {
    const items = this._data[key] as any[];
    this._data[key] = items.filter(i => i.id !== id) as any;
    this._save();
  }

  // --- Projects ---
  getProjects = () => this._getAll('projects');
  getProjectById = (id: string) => this.getProjects().find(p => p.id === id);
  addProject = (data: Omit<Project, 'id'>) => this._add('projects', data, 'PROJ');
  updateProject = (data: Project) => this._update('projects', data);
  deleteProject = (id: string) => this._delete('projects', id);
  public getProjectFinancialTransactions = (projectId: string): ProjectFinancialTransaction[] => {
    const project = this.getProjectById(projectId);
    if (!project) return [];

    const transactions: ProjectFinancialTransaction[] = [];

    this._data.invoices.filter(i => i.project === project.name).forEach(i => transactions.push({
        id: `invoice-${i.id}`, date: i.issueDate, type: 'فاتورة عميل',
        description: `فاتورة رقم ${i.id}`, income: i.amount, expense: 0,
        relatedDocumentId: i.id
    }));

    this._data.supplierBills.filter(b => b.projectName === project.name).forEach(b => transactions.push({
        id: `bill-${b.id}`, date: b.issueDate, type: 'فاتورة مورد',
        description: `فاتورة من ${b.supplierName}`, income: 0, expense: b.amount,
        relatedDocumentId: b.id
    }));

    this._data.custodies.filter(c => c.projectId === projectId && c.status === 'closed').forEach(c => transactions.push({
        id: `custody-${c.id}`, date: c.date, type: 'تسوية عهدة',
        description: `تسوية عهدة ${c.employeeName}`, income: 0, expense: c.settledAmount,
        relatedDocumentId: c.id
    }));
    
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // --- Clients ---
  getClients = () => this._getAll('clients');
  addClient = (data: Omit<Client, 'id'>) => this._add('clients', data, 'CUST');
  updateClient = (data: Client) => this._update('clients', data);
  deleteClient = (id: string) => this._delete('clients', id);

  // --- Suppliers ---
  getSuppliers = () => this._getAll('suppliers');
  addSupplier = (data: Omit<Supplier, 'id'>) => this._add('suppliers', data, 'SUP');
  updateSupplier = (data: Supplier) => this._update('suppliers', data);
  deleteSupplier = (id: string) => this._delete('suppliers', id);

  // --- Invoices ---
  getInvoices = () => this._getAll('invoices');
  addInvoice = (data: Omit<Invoice, 'id'>) => this._add('invoices', data, 'INV', { useYear: true });
  updateInvoice = (data: Invoice) => this._update('invoices', data);
  deleteInvoice = (id: string) => this._delete('invoices', id);
  
  // --- Accounts ---
  getAccounts = () => this._getAll('accounts');
  getAccountByCode = (code: string) => this.getAccounts().find(a => a.code === code);
  addAccount = (data: Omit<Account, 'id'>) => {
     const newAccount = { ...data, id: data.code }; // Use code as ID for accounts
     this._data.accounts.push(newAccount);
     this._save();
     return newAccount;
  }
  updateAccount = (data: Account) => this._update('accounts', data);
  deleteAccount = (id: string) => {
    const idsToDelete = new Set<string>([id]);
    let changed = true;
    while(changed) {
        changed = false;
        this._data.accounts.forEach(acc => {
            if(acc.parentId && idsToDelete.has(acc.parentId) && !idsToDelete.has(acc.id)){
                idsToDelete.add(acc.id);
                changed = true;
            }
        });
    }
    this._data.accounts = this._data.accounts.filter(acc => !idsToDelete.has(acc.id));
    this._save();
  };

  // --- Journal Vouchers ---
  getJournalVouchers = () => this._getAll('journalVouchers');
  addJournalVoucher = (data: Omit<JournalVoucher, 'id'>) => this._add('journalVouchers', data, 'JV', { useYear: true });
  updateJournalVoucher = (data: JournalVoucher) => this._update('journalVouchers', data);
  deleteJournalVoucher = (id: string) => this._delete('journalVouchers', id);
  
  // --- Purchase Orders ---
  getPurchaseOrders = () => this._getAll('purchaseOrders');
  addPurchaseOrder = (data: Omit<PurchaseOrder, 'id'>) => this._add('purchaseOrders', data, 'PO', { useYear: true });
  updatePurchaseOrder = (data: PurchaseOrder) => this._update('purchaseOrders', data);
  deletePurchaseOrder = (id: string) => this._delete('purchaseOrders', id);
  completePurchaseOrder = (poId: string): PurchaseOrder | null => {
    const poIndex = this._data.purchaseOrders.findIndex(p => p.id === poId);
    if (poIndex === -1) return null;

    const po = this._data.purchaseOrders[poIndex];
    if (po.status !== 'approved') {
      console.error("Can only complete 'approved' orders.");
      return null;
    }
    
    // 1. Create Journal Voucher
    const inventoryAccount = this._data.accounts.find(a => a.code === '112');
    const payableAccount = this._data.accounts.find(a => a.code === '211');
    if (!inventoryAccount || !payableAccount) {
        console.error("Required accounts for PO completion are missing (Inventory: 112, Payables: 211)");
        return null;
    }

    const totalAmount = po.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
    const jvData: Omit<JournalVoucher, 'id'> = {
        date: new Date().toISOString().split('T')[0],
        description: `استلام أصناف بموجب أمر الشراء ${po.id}`,
        status: 'posted',
        lines: [
            { accountId: inventoryAccount.id, description: `زيادة المخزون من ${po.supplierName}`, debit: totalAmount, credit: 0 },
            { accountId: payableAccount.id, description: `استحقاق للمورد ${po.supplierName}`, debit: 0, credit: totalAmount },
        ]
    };
    const newJv = this.addJournalVoucher(jvData);

    // 2. Update Inventory
    po.lines.forEach(line => {
        const itemIndex = this._data.inventory.findIndex(i => i.name.trim() === line.description.trim());
        if (itemIndex > -1) {
            const item = this._data.inventory[itemIndex];
            const oldTotalValue = item.quantity * item.averageCost;
            const newItemsValue = line.quantity * line.unitPrice;
            const newTotalQuantity = item.quantity + line.quantity;
            item.averageCost = newTotalQuantity > 0 ? (oldTotalValue + newItemsValue) / newTotalQuantity : 0;
            item.quantity = newTotalQuantity;
            this._data.inventory[itemIndex] = item;
        } else {
            this.addInventoryItem({
                name: line.description,
                category: 'مواد عامة', // default category
                quantity: line.quantity,
                unit: 'وحدة', // default unit
                averageCost: line.unitPrice
            });
        }
    });

    // 3. Update PO status
    const updatedPO = { ...po, status: 'completed' as const, journalVoucherId: newJv.id };
    this._data.purchaseOrders[poIndex] = updatedPO;

    this._save();
    return updatedPO;
  }


  // --- Inventory ---
  getInventory = () => this._getAll('inventory');
  addInventoryItem = (data: Omit<InventoryItem, 'id'>) => this._add('inventory', data, 'MAT');
  updateInventoryItem = (data: InventoryItem) => this._update('inventory', data);
  deleteInventoryItem = (id: string) => this._delete('inventory', id);

  // --- Users ---
  getUsers = () => this._getAll('users');
  addUser = (data: Omit<User, 'id' | 'password'>) => {
    const userData = { ...data };
    if (!userData.avatarUrl) {
      const newId = this._data.users.length + 1;
      userData.avatarUrl = `https://i.pravatar.cc/150?u=USR-NEW-${newId}`;
    }
    return this._add('users', userData, 'USR');
  }
  updateUser = (data: User) => this._update('users', data);
  deleteUser = (id: string) => this._delete('users', id);

  // --- Employees ---
  getEmployees = () => this._getAll('employees');
  addEmployee = (data: Omit<Employee, 'id'>) => this._add('employees', data, 'EMP');
  updateEmployee = (data: Employee) => this._update('employees', data);
  deleteEmployee = (id: string) => this._delete('employees', id);

  // --- Payroll Runs ---
  getPayrollRuns = () => this._getAll('payrollRuns');
  addPayrollRun = (data: Omit<PayrollRun, 'id'>) => this._add('payrollRuns', data, 'PAY', { useYear: true });
  updatePayrollRun = (data: PayrollRun) => this._update('payrollRuns', data);
  deletePayrollRun = (id: string) => this._delete('payrollRuns', id);
  
  // --- Vouchers ---
  getVouchers = () => this._getAll('vouchers');
  addVoucher = (data: Omit<Voucher, 'id'>) => {
    const prefix = data.type === 'payment' ? 'PV' : 'RV';
    return this._add('vouchers', data, prefix, { useYear: true });
  }
  updateVoucher = (data: Voucher) => this._update('vouchers', data);
  deleteVoucher = (id: string) => this._delete('vouchers', id);
  
  // --- Change Orders ---
  getChangeOrders = () => this._getAll('changeOrders');
  addChangeOrder = (data: Omit<ChangeOrder, 'id'>) => this._add('changeOrders', data, 'CO');
  updateChangeOrder = (data: ChangeOrder) => this._update('changeOrders', data);
  deleteChangeOrder = (id: string) => this._delete('changeOrders', id);

  // --- Custody ---
  getCustodies = () => this._getAll('custodies');
  addCustody = (data: Omit<Custody, 'id'>) => this._add('custodies', data, 'CUST');
  updateCustody = (data: Custody) => this._update('custodies', data);
  deleteCustody = (id: string) => this._delete('custodies', id);
  
  // --- Budget Lines ---
  getBudgetLinesForProject = (projectId: string) => this._getAll('budgetLines').filter(bl => bl.projectId === projectId);
  addBudgetLine = (data: Omit<BudgetLine, 'id'>) => this._add('budgetLines', data, 'BL');
  updateBudgetLine = (data: BudgetLine) => this._update('budgetLines', data);
  deleteBudgetLine = (id: string) => this._delete('budgetLines', id);
  
  // --- Supplier Bills ---
  getSupplierBills = () => this._getAll('supplierBills');
  addSupplierBill = (data: Omit<SupplierBill, 'id'>) => this._add('supplierBills', data, 'BILL');
  updateSupplierBill = (data: SupplierBill) => this._update('supplierBills', data);
  deleteSupplierBill = (id: string) => this._delete('supplierBills', id);
  
  // --- Tasks ---
  getTasksForProject = (projectId: string) => this._getAll('tasks').filter(t => t.projectId === projectId);
  addTask = (data: Omit<ProjectTask, 'id'>) => this._add('tasks', data, 'TASK');
  updateTask = (data: ProjectTask) => this._update('tasks', data);
  deleteTask = (id: string) => this._delete('tasks', id);

  // --- Subcontracts ---
  getSubcontracts = () => this._getAll('subcontracts');
  getSubcontractById = (id: string) => this.getSubcontracts().find(s => s.id === id);
  addSubcontract = (data: Omit<Subcontract, 'id'>) => this._add('subcontracts', data, 'SUB');
  updateSubcontract = (data: Subcontract) => this._update('subcontracts', data);
  deleteSubcontract = (id: string) => {
    // Also delete related payments
    this._data.subcontractorPayments = this._data.subcontractorPayments.filter(p => p.subcontractId !== id);
    this._delete('subcontracts', id); // will save
  };

  // --- Subcontractor Payments ---
  getAllSubcontractorPayments = () => this._getAll('subcontractorPayments');
  getSubcontractorPayments = (subcontractId: string) => this.getAllSubcontractorPayments().filter(p => p.subcontractId === subcontractId);
  addSubcontractorPayment = (data: Omit<SubcontractorPayment, 'id' | 'paymentNumber'>): SubcontractorPayment => {
    const existingPayments = this.getSubcontractorPayments(data.subcontractId);
    const maxPaymentNum = Math.max(0, ...existingPayments.map(p => p.paymentNumber));
    const newPayment = { ...data, paymentNumber: maxPaymentNum + 1 };
    return this._add('subcontractorPayments', newPayment, 'SP');
  };
  updateSubcontractorPayment = (data: SubcontractorPayment) => this._update('subcontractorPayments', data);
  deleteSubcontractorPayment = (id: string) => this._delete('subcontractorPayments', id);

  // --- Attachments ---
  getAttachments = (relatedId: string, relatedType: string): Attachment[] => {
    return this._data.attachments.filter(a => a.relatedId === relatedId && a.relatedType === relatedType);
  };
  
  async addAttachment(file: File, relatedId: string, relatedType: string): Promise<Attachment> {
    const url = await this._readFileAsDataURL(file);
    const attachmentData: Omit<Attachment, 'id'> = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      url: url,
      relatedId: relatedId,
      relatedType: relatedType,
      uploadedAt: new Date().toISOString(),
    };
    return this._add('attachments', attachmentData, 'ATT');
  }

  deleteAttachment = (id: string): void => {
    this._delete('attachments', id);
  };

  // --- Assets ---
  getAssets = () => this._getAll('assets');
  addAsset = (data: Omit<Asset, 'id'>) => this._add('assets', data, 'ASSET');
  updateAsset = (data: Asset) => this._update('assets', data);
  deleteAsset = (id: string) => this._delete('assets', id);
  
  // --- Documents ---
  getDocuments = () => this._getAll('documents');
  async addDocument(file: File, data: Omit<Document, 'id' | 'fileName' | 'fileType' | 'fileSize' | 'url' | 'uploadedAt' | 'storagePath'>): Promise<Document> {
      const url = await this._readFileAsDataURL(file);
      const docData: Omit<Document, 'id' | 'storagePath'> = {
          ...data,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          url: url,
          uploadedAt: new Date().toISOString(),
      };
      return this._add('documents', docData, 'DOC');
  }
  updateDocument = (data: Document): Document | null => this._update('documents', data);
  deleteDocument = (id: string): void => this._delete('documents', id);

  // --- Settings & Permissions ---
  getSettings = () => this._getAll('settings');
  updateSettings = (data: SettingsData): SettingsData => {
    this._data.settings = data;
    this._save();
    return data;
  };
  getPermissions = () => this._getAll('permissions');
  updatePermissions = (data: AllRolesPermissions): AllRolesPermissions => {
    this._data.permissions = data;
    this._save();
    return data;
  };
  
  // --- AI Features ---
  getFinancialOverviewData = (): FinancialOverviewData => {
    return {
      projects: this._data.projects.map(({ name, budget, spent, status, startDate, endDate }) => ({ name, budget, spent, status, startDate, endDate })),
      invoices: this._data.invoices.map(({ project, amount, status, issueDate, dueDate }) => ({ project, amount, status, issueDate, dueDate })),
      supplierBills: this._data.supplierBills.map(({ projectName, amount, status, issueDate, dueDate }) => ({ projectName, amount, status, issueDate, dueDate })),
      payrollRuns: this._data.payrollRuns.map(({ period, payDate, status, slips }) => ({ period, payDate, status, totalPaid: (slips || []).reduce((sum, s) => sum + s.netPay, 0) })),
    }
  }

  // --- Data Management ---
  exportAllData = (): string => {
    return JSON.stringify(this._data, null, 2);
  }

  importData = (jsonString: string): { success: boolean, message: string } => {
    try {
      const parsedData = JSON.parse(jsonString);
      // Basic validation: check if a few key properties exist
      if (parsedData && parsedData.projects && parsedData.settings) {
        this._data = parsedData;
        this._save();
        return { success: true, message: 'Data imported successfully.' };
      }
      return { success: false, message: 'Invalid data format.' };
    } catch (error) {
      return { success: false, message: 'Failed to parse JSON file.' };
    }
  }

}

export const db = new Database();