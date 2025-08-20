import { db } from './database';
import type { 
    Project, Client, Supplier, Invoice, Account, JournalVoucher, PurchaseOrder, InventoryItem, 
    User, Employee, PayrollRun, Voucher, ChangeOrder, Custody, BudgetLine, SupplierBill,
    ProjectTask, Subcontract, SubcontractorPayment, SettingsData, AllRolesPermissions, Attachment,
    ProjectFinancialTransaction, FinancialOverviewData, Asset, Document
} from './types';

const LATENCY = 300; // ms

const simulateNetwork = <T>(data: T): Promise<T> => {
  return new Promise(resolve => {
    // A deep copy to prevent mutations affecting the original 'db' object before it's "saved"
    const deepCopiedData = JSON.parse(JSON.stringify(data));
    setTimeout(() => resolve(deepCopiedData), LATENCY);
  });
};

// --- Projects ---
export const getProjects = async (): Promise<Project[]> => simulateNetwork(db.getProjects());
export const getProjectById = async (id: string): Promise<Project | undefined> => simulateNetwork(db.getProjectById(id));
export const addProject = async (data: Omit<Project, 'id'>): Promise<Project> => simulateNetwork(db.addProject(data));
export const updateProject = async (data: Project): Promise<Project | null> => simulateNetwork(db.updateProject(data));
export const deleteProject = async (id: string): Promise<void> => simulateNetwork(db.deleteProject(id));
export const getProjectFinancialTransactions = async (projectId: string): Promise<ProjectFinancialTransaction[]> => simulateNetwork(db.getProjectFinancialTransactions(projectId));


// --- Clients ---
export const getClients = async (): Promise<Client[]> => simulateNetwork(db.getClients());
export const addClient = async (data: Omit<Client, 'id'>): Promise<Client> => simulateNetwork(db.addClient(data));
export const updateClient = async (data: Client): Promise<Client | null> => simulateNetwork(db.updateClient(data));
export const deleteClient = async (id: string): Promise<void> => simulateNetwork(db.deleteClient(id));

// --- Suppliers ---
export const getSuppliers = async (): Promise<Supplier[]> => simulateNetwork(db.getSuppliers());
export const addSupplier = async (data: Omit<Supplier, 'id'>): Promise<Supplier> => simulateNetwork(db.addSupplier(data));
export const updateSupplier = async (data: Supplier): Promise<Supplier | null> => simulateNetwork(db.updateSupplier(data));
export const deleteSupplier = async (id: string): Promise<void> => simulateNetwork(db.deleteSupplier(id));

// --- Invoices ---
export const getInvoices = async (): Promise<Invoice[]> => simulateNetwork(db.getInvoices());
export const addInvoice = async (data: Omit<Invoice, 'id'>): Promise<Invoice> => simulateNetwork(db.addInvoice(data));
export const updateInvoice = async (data: Invoice): Promise<Invoice | null> => simulateNetwork(db.updateInvoice(data));
export const deleteInvoice = async (id: string): Promise<void> => simulateNetwork(db.deleteInvoice(id));

// --- Accounts ---
export const getAccounts = async (): Promise<Account[]> => simulateNetwork(db.getAccounts());
export const getAccountByCode = async (code: string): Promise<Account | undefined> => simulateNetwork(db.getAccountByCode(code));
export const addAccount = async (data: Omit<Account, 'id'>): Promise<Account> => simulateNetwork(db.addAccount(data));
export const updateAccount = async (data: Account): Promise<Account | null> => simulateNetwork(db.updateAccount(data));
export const deleteAccount = async (id: string): Promise<void> => simulateNetwork(db.deleteAccount(id));

// --- Journal Vouchers ---
export const getJournalVouchers = async (): Promise<JournalVoucher[]> => simulateNetwork(db.getJournalVouchers());
export const addJournalVoucher = async (data: Omit<JournalVoucher, 'id'>): Promise<JournalVoucher> => simulateNetwork(db.addJournalVoucher(data));
export const updateJournalVoucher = async (data: JournalVoucher): Promise<JournalVoucher | null> => simulateNetwork(db.updateJournalVoucher(data));
export const deleteJournalVoucher = async (id: string): Promise<void> => simulateNetwork(db.deleteJournalVoucher(id));

// --- Purchase Orders ---
export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => simulateNetwork(db.getPurchaseOrders());
export const addPurchaseOrder = async (data: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder> => simulateNetwork(db.addPurchaseOrder(data));
export const updatePurchaseOrder = async (data: PurchaseOrder): Promise<PurchaseOrder | null> => simulateNetwork(db.updatePurchaseOrder(data));
export const deletePurchaseOrder = async (id: string): Promise<void> => simulateNetwork(db.deletePurchaseOrder(id));
export const completePurchaseOrder = async (poId: string): Promise<PurchaseOrder | null> => simulateNetwork(db.completePurchaseOrder(poId));

// --- Inventory ---
export const getInventory = async (): Promise<InventoryItem[]> => simulateNetwork(db.getInventory());
export const addInventoryItem = async (data: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => simulateNetwork(db.addInventoryItem(data));
export const updateInventoryItem = async (data: InventoryItem): Promise<InventoryItem | null> => simulateNetwork(db.updateInventoryItem(data));
export const deleteInventoryItem = async (id: string): Promise<void> => simulateNetwork(db.deleteInventoryItem(id));

// --- Users ---
export const getUsers = async (): Promise<User[]> => simulateNetwork(db.getUsers());
export const addUser = async (data: Omit<User, 'id' | 'password'>): Promise<User> => simulateNetwork(db.addUser(data));
export const updateUser = async (data: User): Promise<User | null> => simulateNetwork(db.updateUser(data));
export const deleteUser = async (id: string): Promise<void> => simulateNetwork(db.deleteUser(id));

// --- Employees ---
export const getEmployees = async (): Promise<Employee[]> => simulateNetwork(db.getEmployees());
export const addEmployee = async (data: Omit<Employee, 'id'>): Promise<Employee> => simulateNetwork(db.addEmployee(data));
export const updateEmployee = async (data: Employee): Promise<Employee | null> => simulateNetwork(db.updateEmployee(data));
export const deleteEmployee = async (id: string): Promise<void> => simulateNetwork(db.deleteEmployee(id));

// --- Payroll Runs ---
export const getPayrollRuns = async (): Promise<PayrollRun[]> => simulateNetwork(db.getPayrollRuns());
export const addPayrollRun = async (data: Omit<PayrollRun, 'id'>): Promise<PayrollRun> => simulateNetwork(db.addPayrollRun(data));
export const updatePayrollRun = async (data: PayrollRun): Promise<PayrollRun | null> => simulateNetwork(db.updatePayrollRun(data));
export const deletePayrollRun = async (id: string): Promise<void> => simulateNetwork(db.deletePayrollRun(id));

// --- Vouchers ---
export const getVouchers = async (): Promise<Voucher[]> => simulateNetwork(db.getVouchers());
export const addVoucher = async (data: Omit<Voucher, 'id'>): Promise<Voucher> => simulateNetwork(db.addVoucher(data));
export const updateVoucher = async (data: Voucher): Promise<Voucher | null> => simulateNetwork(db.updateVoucher(data));
export const deleteVoucher = async (id: string): Promise<void> => simulateNetwork(db.deleteVoucher(id));

// --- Change Orders ---
export const getChangeOrders = async (): Promise<ChangeOrder[]> => simulateNetwork(db.getChangeOrders());
export const addChangeOrder = async (data: Omit<ChangeOrder, 'id'>): Promise<ChangeOrder> => simulateNetwork(db.addChangeOrder(data));
export const updateChangeOrder = async (data: ChangeOrder): Promise<ChangeOrder | null> => simulateNetwork(db.updateChangeOrder(data));
export const deleteChangeOrder = async (id: string): Promise<void> => simulateNetwork(db.deleteChangeOrder(id));

// --- Custody ---
export const getCustodies = async (): Promise<Custody[]> => simulateNetwork(db.getCustodies());
export const addCustody = async (data: Omit<Custody, 'id'>): Promise<Custody> => simulateNetwork(db.addCustody(data));
export const updateCustody = async (data: Custody): Promise<Custody | null> => simulateNetwork(db.updateCustody(data));
export const deleteCustody = async (id: string): Promise<void> => simulateNetwork(db.deleteCustody(id));

// --- Budget Lines ---
export const getBudgetLinesForProject = async (projectId: string): Promise<BudgetLine[]> => simulateNetwork(db.getBudgetLinesForProject(projectId));
export const addBudgetLine = async (data: Omit<BudgetLine, 'id'>): Promise<BudgetLine> => simulateNetwork(db.addBudgetLine(data));
export const updateBudgetLine = async (data: BudgetLine): Promise<BudgetLine | null> => simulateNetwork(db.updateBudgetLine(data));
export const deleteBudgetLine = async (id: string): Promise<void> => simulateNetwork(db.deleteBudgetLine(id));

// --- Supplier Bills ---
export const getSupplierBills = async (): Promise<SupplierBill[]> => simulateNetwork(db.getSupplierBills());
export const addSupplierBill = async (data: Omit<SupplierBill, 'id'>): Promise<SupplierBill> => simulateNetwork(db.addSupplierBill(data));
export const updateSupplierBill = async (data: SupplierBill): Promise<SupplierBill | null> => simulateNetwork(db.updateSupplierBill(data));
export const deleteSupplierBill = async (id: string): Promise<void> => simulateNetwork(db.deleteSupplierBill(id));

// --- Tasks ---
export const getTasksForProject = async (projectId: string): Promise<ProjectTask[]> => simulateNetwork(db.getTasksForProject(projectId));
export const addTask = async (data: Omit<ProjectTask, 'id'>): Promise<ProjectTask> => simulateNetwork(db.addTask(data));
export const updateTask = async (data: ProjectTask): Promise<ProjectTask | null> => simulateNetwork(db.updateTask(data));
export const deleteTask = async (id: string): Promise<void> => simulateNetwork(db.deleteTask(id));

// --- Subcontracts ---
export const getSubcontracts = async (): Promise<Subcontract[]> => simulateNetwork(db.getSubcontracts());
export const getSubcontractById = async (id: string): Promise<Subcontract | undefined> => simulateNetwork(db.getSubcontractById(id));
export const addSubcontract = async (data: Omit<Subcontract, 'id'>): Promise<Subcontract> => simulateNetwork(db.addSubcontract(data));
export const updateSubcontract = async (data: Subcontract): Promise<Subcontract | null> => simulateNetwork(db.updateSubcontract(data));
export const deleteSubcontract = async (id: string): Promise<void> => simulateNetwork(db.deleteSubcontract(id));

// --- Subcontractor Payments ---
export const getAllSubcontractorPayments = async (): Promise<SubcontractorPayment[]> => simulateNetwork(db.getAllSubcontractorPayments());
export const getSubcontractorPayments = async (subcontractId: string): Promise<SubcontractorPayment[]> => simulateNetwork(db.getSubcontractorPayments(subcontractId));
export const addSubcontractorPayment = async (data: Omit<SubcontractorPayment, 'id' | 'paymentNumber'>): Promise<SubcontractorPayment> => simulateNetwork(db.addSubcontractorPayment(data));
export const updateSubcontractorPayment = async (data: SubcontractorPayment): Promise<SubcontractorPayment | null> => simulateNetwork(db.updateSubcontractorPayment(data));
export const deleteSubcontractorPayment = async (id: string): Promise<void> => simulateNetwork(db.deleteSubcontractorPayment(id));

// --- Attachments ---
export const getAttachments = async (relatedId: string, relatedType: string): Promise<Attachment[]> => simulateNetwork(db.getAttachments(relatedId, relatedType));
export const addAttachment = async (file: File, relatedId: string, relatedType: string): Promise<Attachment> => db.addAttachment(file, relatedId, relatedType); // No latency simulation for file ops
export const deleteAttachment = async (id: string): Promise<void> => simulateNetwork(db.deleteAttachment(id));

// --- Assets ---
export const getAssets = async (): Promise<Asset[]> => simulateNetwork(db.getAssets());
export const addAsset = async (data: Omit<Asset, 'id'>): Promise<Asset> => simulateNetwork(db.addAsset(data));
export const updateAsset = async (data: Asset): Promise<Asset | null> => simulateNetwork(db.updateAsset(data));
export const deleteAsset = async (id: string): Promise<void> => simulateNetwork(db.deleteAsset(id));

// --- Documents ---
export const getDocuments = async (): Promise<Document[]> => simulateNetwork(db.getDocuments());
export const addDocument = async (file: File, data: Omit<Document, 'id' | 'fileName' | 'fileType' | 'fileSize' | 'url' | 'uploadedAt' | 'storagePath'>): Promise<Document> => db.addDocument(file, data); // No latency simulation for file ops
export const updateDocument = async (data: Document): Promise<Document | null> => simulateNetwork(db.updateDocument(data));
export const deleteDocument = async (id: string): Promise<void> => simulateNetwork(db.deleteDocument(id));

// --- Settings ---
export const getSettings = async (): Promise<SettingsData> => simulateNetwork(db.getSettings());
export const updateSettings = async (data: SettingsData): Promise<SettingsData> => simulateNetwork(db.updateSettings(data));

// --- Permissions ---
export const getPermissions = async (): Promise<AllRolesPermissions> => simulateNetwork(db.getPermissions());
export const updatePermissions = async (data: AllRolesPermissions): Promise<AllRolesPermissions> => simulateNetwork(db.updatePermissions(data));

// --- AI Features ---
export const getFinancialOverviewData = async (): Promise<FinancialOverviewData> => simulateNetwork(db.getFinancialOverviewData());

// --- Data Management ---
export const exportAllData = (): string => db.exportAllData();
export const importData = (jsonString: string): { success: boolean, message: string } => db.importData(jsonString);
export const clearLocalDatabase = (): void => db.clearDatabase();
