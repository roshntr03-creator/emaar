import { collection, query, where, getDocs, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, runTransaction, writeBatch, Query, DocumentData, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { initializeFirebase } from './config';

import type { 
    Project, Client, Supplier, Invoice, Account, JournalVoucher, PurchaseOrder, InventoryItem, 
    User, Employee, PayrollRun, Voucher, ChangeOrder, Custody, BudgetLine, SupplierBill,
    ProjectTask, Subcontract, SubcontractorPayment, SettingsData, AllRolesPermissions, Attachment,
    ProjectFinancialTransaction, FinancialOverviewData, Asset, Document
} from '../types';

// --- Generic Helpers ---

async function getCollectionData<T extends { id?: string }>(collectionName: string, q?: Query<DocumentData>): Promise<T[]> {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) return [];
    try {
        const queryToExecute = q || collection(firebaseServices.db, collectionName);
        const querySnapshot = await getDocs(queryToExecute);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
    } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        return [];
    }
}


async function getDocumentData<T extends { id?: string }>(collectionName: string, id: string): Promise<T | undefined> {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) return undefined;
    try {
        const docRef = doc(firebaseServices.db, collectionName, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? ({ ...docSnap.data(), id: docSnap.id } as T) : undefined;
    } catch (error) {
        console.error(`Error fetching document ${id} from ${collectionName}:`, error);
        return undefined;
    }
}

async function addDocumentData<T extends { id: string }>(collectionName: string, data: Omit<T, 'id'>, customId?: string): Promise<T> {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) throw new Error("Firebase not initialized");
    if (customId) {
        const docRef = doc(firebaseServices.db, collectionName, customId);
        await setDoc(docRef, data);
        return { ...data, id: customId } as T;
    } else {
        const docRef = await addDoc(collection(firebaseServices.db, collectionName), data);
        return { ...data, id: docRef.id } as T;
    }
}

async function updateDocumentData<T extends { id: string }>(collectionName: string, data: T): Promise<T> {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) throw new Error("Firebase not initialized");
    const docRef = doc(firebaseServices.db, collectionName, data.id);
    const dataToUpdate = { ...data };
    delete (dataToUpdate as any).id; // Do not save the id field inside the document
    await updateDoc(docRef, dataToUpdate);
    return data;
}

async function deleteDocumentData(collectionName: string, id: string): Promise<void> {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) throw new Error("Firebase not initialized");
    await deleteDoc(doc(firebaseServices.db, collectionName, id));
}

// --- Projects ---
export const getProjects = (): Promise<Project[]> => getCollectionData('projects');
export const getProjectById = (id: string): Promise<Project | undefined> => getDocumentData('projects', id);
export const addProject = (data: Omit<Project, 'id'>): Promise<Project> => addDocumentData('projects', data);
export const updateProject = (data: Project): Promise<Project> => updateDocumentData('projects', data);
export const deleteProject = (id: string): Promise<void> => deleteDocumentData('projects', id);
export const getProjectFinancialTransactions = async (projectId: string): Promise<ProjectFinancialTransaction[]> => {
    const project = await getProjectById(projectId);
    if (!project) return [];

    const [invoices, supplierBills, custodies] = await Promise.all([
        getInvoices(),
        getSupplierBills(),
        getCustodies(),
    ]);

    const transactions: ProjectFinancialTransaction[] = [];

    invoices.filter(i => i.project === project.name).forEach(i => transactions.push({
        id: `invoice-${i.id}`, date: i.issueDate, type: 'فاتورة عميل',
        description: `فاتورة رقم ${i.id}`, income: i.amount, expense: 0,
        relatedDocumentId: i.id
    }));

    supplierBills.filter(b => b.projectName === project.name).forEach(b => transactions.push({
        id: `bill-${b.id}`, date: b.issueDate, type: 'فاتورة مورد',
        description: `فاتورة من ${b.supplierName}`, income: 0, expense: b.amount,
        relatedDocumentId: b.id
    }));

    custodies.filter(c => c.projectId === projectId && c.status === 'closed').forEach(c => transactions.push({
        id: `custody-${c.id}`, date: c.date, type: 'تسوية عهدة',
        description: `تسوية عهدة ${c.employeeName}`, income: 0, expense: c.settledAmount,
        relatedDocumentId: c.id
    }));
    
    // This requires fetching inventory to calculate cost, which can be slow.
    // For now, let's assume we can do it. In a real app, costs might be stored on the requisition upon issuance.
    // Material requisitions removed.

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// --- Clients ---
export const getClients = (): Promise<Client[]> => getCollectionData('clients');
export const addClient = (data: Omit<Client, 'id'>): Promise<Client> => addDocumentData('clients', data);
export const updateClient = (data: Client): Promise<Client> => updateDocumentData('clients', data);
export const deleteClient = (id: string): Promise<void> => deleteDocumentData('clients', id);

// --- Suppliers ---
export const getSuppliers = (): Promise<Supplier[]> => getCollectionData('suppliers');
export const addSupplier = (data: Omit<Supplier, 'id'>): Promise<Supplier> => addDocumentData('suppliers', data);
export const updateSupplier = (data: Supplier): Promise<Supplier> => updateDocumentData('suppliers', data);
export const deleteSupplier = (id: string): Promise<void> => deleteDocumentData('suppliers', id);

// --- Invoices ---
export const getInvoices = (): Promise<Invoice[]> => getCollectionData('invoices');
export const addInvoice = (data: Omit<Invoice, 'id'>): Promise<Invoice> => addDocumentData('invoices', data);
export const updateInvoice = (data: Invoice): Promise<Invoice> => updateDocumentData('invoices', data);
export const deleteInvoice = (id: string): Promise<void> => deleteDocumentData('invoices', id);

// --- Accounts ---
export const getAccounts = (): Promise<Account[]> => getCollectionData('accounts');
export const addAccount = (data: Omit<Account, 'id'>): Promise<Account> => addDocumentData('accounts', data, data.code);
export const updateAccount = (data: Account): Promise<Account> => updateDocumentData('accounts', data);
export const deleteAccount = async (id: string): Promise<void> => {
    // Note: Complex logic like recursive delete is better in a backend function, but emulated here.
    console.warn("Recursive account delete might be slow on client-side");
    const allAccounts = await getAccounts();
    const idsToDelete = new Set<string>([id]);
    let changed = true;
    while(changed) {
        changed = false;
        allAccounts.forEach(acc => {
            if(acc.parentId && idsToDelete.has(acc.parentId) && !idsToDelete.has(acc.id)){
                idsToDelete.add(acc.id);
                changed = true;
            }
        });
    }
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) throw new Error("Firebase not initialized");
    const batch = writeBatch(firebaseServices.db);
    idsToDelete.forEach(accId => {
        batch.delete(doc(firebaseServices.db, "accounts", accId));
    });
    await batch.commit();
};


// --- Journal Vouchers ---
export const getJournalVouchers = (): Promise<JournalVoucher[]> => getCollectionData('journalVouchers');
export const addJournalVoucher = (data: Omit<JournalVoucher, 'id'>): Promise<JournalVoucher> => addDocumentData('journalVouchers', data);
export const updateJournalVoucher = (data: JournalVoucher): Promise<JournalVoucher> => updateDocumentData('journalVouchers', data);
export const deleteJournalVoucher = (id: string): Promise<void> => deleteDocumentData('journalVouchers', id);

// --- Purchase Orders ---
export const getPurchaseOrders = (): Promise<PurchaseOrder[]> => getCollectionData('purchaseOrders');
export const addPurchaseOrder = (data: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder> => addDocumentData('purchaseOrders', data);
export const updatePurchaseOrder = (data: PurchaseOrder): Promise<PurchaseOrder> => updateDocumentData('purchaseOrders', data);
export const deletePurchaseOrder = (id: string): Promise<void> => deleteDocumentData('purchaseOrders', id);
export const completePurchaseOrder = async (poId: string): Promise<PurchaseOrder | null> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) throw new Error("Firebase not initialized");
    const db = firebaseServices.db;
    
    // Fetch accounts needed for the transaction beforehand
    const invAccQuery = query(collection(db, 'accounts'), where("code", "==", "112"), limit(1));
    const payAccQuery = query(collection(db, 'accounts'), where("code", "==", "211"), limit(1));

    try {
        const [invAccSnap, payAccSnap] = await Promise.all([
            getDocs(invAccQuery),
            getDocs(payAccQuery)
        ]);

        if (invAccSnap.empty || payAccSnap.empty) {
            throw new Error("Required accounts (Inventory: 112, Payables: 211) not found.");
        }
        
        const inventoryAccount = { id: invAccSnap.docs[0].id, ...invAccSnap.docs[0].data() } as Account;
        const payableAccount = { id: payAccSnap.docs[0].id, ...payAccSnap.docs[0].data() } as Account;

        return await runTransaction(db, async (transaction) => {
            const poRef = doc(db, 'purchaseOrders', poId);
            const poDoc = await transaction.get(poRef);
            if (!poDoc.exists()) throw new Error("Purchase order not found");
            
            const po = { ...poDoc.data(), id: poDoc.id } as PurchaseOrder;
            if (po.status !== 'approved') throw new Error("Can only complete 'approved' orders.");

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
            const jvRef = doc(collection(db, 'journalVouchers'));
            transaction.set(jvRef, jvData);

            for (const line of po.lines) {
                // This query inside a transaction is not ideal for performance but will work.
                // In a high-throughput system, this might be redesigned.
                const itemQuery = query(collection(db, 'inventory'), where("name", "==", line.description.trim()), limit(1));
                const itemSnap = await getDocs(itemQuery);
                
                if (!itemSnap.empty) {
                    const itemDoc = itemSnap.docs[0];
                    const item = { ...itemDoc.data(), id: itemDoc.id } as InventoryItem;
                    const oldTotalValue = item.quantity * item.averageCost;
                    const newItemsValue = line.quantity * line.unitPrice;
                    const newTotalQuantity = item.quantity + line.quantity;
                    const newAverageCost = newTotalQuantity > 0 ? (oldTotalValue + newItemsValue) / newTotalQuantity : 0;
                    
                    transaction.update(itemDoc.ref, { quantity: newTotalQuantity, averageCost: newAverageCost });
                } else {
                    const newItemData: Omit<InventoryItem, 'id'> = { name: line.description, category: 'مواد عامة', quantity: line.quantity, unit: 'وحدة', averageCost: line.unitPrice };
                    const newItemRef = doc(collection(db, 'inventory'));
                    transaction.set(newItemRef, newItemData);
                }
            }

            transaction.update(poRef, { status: 'completed', journalVoucherId: jvRef.id });

            return { ...po, status: 'completed' as const, journalVoucherId: jvRef.id };
        });
    } catch (error) {
        console.error("Error completing purchase order in transaction:", error);
        return null;
    }
}


// --- Inventory ---
export const getInventory = (): Promise<InventoryItem[]> => getCollectionData('inventory');
export const addInventoryItem = (data: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => addDocumentData('inventory', data);
export const updateInventoryItem = (data: InventoryItem): Promise<InventoryItem> => updateDocumentData('inventory', data);
export const deleteInventoryItem = (id: string): Promise<void> => deleteDocumentData('inventory', id);

// --- Users ---
export const getUsers = (): Promise<User[]> => getCollectionData('users');
export const addUser = (data: Omit<User, 'id'>): Promise<User> => addDocumentData('users', data);
export const updateUser = (data: User): Promise<User> => updateDocumentData('users', data);
export const deleteUser = (id: string): Promise<void> => deleteDocumentData('users', id);

// --- Employees ---
export const getEmployees = (): Promise<Employee[]> => getCollectionData('employees');
export const addEmployee = (data: Omit<Employee, 'id'>): Promise<Employee> => addDocumentData('employees', data);
export const updateEmployee = (data: Employee): Promise<Employee> => updateDocumentData('employees', data);
export const deleteEmployee = (id: string): Promise<void> => deleteDocumentData('employees', id);

// --- Payroll Runs ---
export const getPayrollRuns = (): Promise<PayrollRun[]> => getCollectionData('payrollRuns');
export const addPayrollRun = (data: Omit<PayrollRun, 'id'>): Promise<PayrollRun> => addDocumentData('payrollRuns', data);
export const updatePayrollRun = (data: PayrollRun): Promise<PayrollRun> => updateDocumentData('payrollRuns', data);
export const deletePayrollRun = (id: string): Promise<void> => deleteDocumentData('payrollRuns', id);

// --- Vouchers ---
export const getVouchers = (): Promise<Voucher[]> => getCollectionData('vouchers');
export const addVoucher = (data: Omit<Voucher, 'id'>): Promise<Voucher> => addDocumentData('vouchers', data);
export const updateVoucher = (data: Voucher): Promise<Voucher> => updateDocumentData('vouchers', data);
export const deleteVoucher = (id: string): Promise<void> => deleteDocumentData('vouchers', id);

// --- Change Orders ---
export const getChangeOrders = (): Promise<ChangeOrder[]> => getCollectionData('changeOrders');
export const addChangeOrder = (data: Omit<ChangeOrder, 'id'>): Promise<ChangeOrder> => addDocumentData('changeOrders', data);
export const updateChangeOrder = (data: ChangeOrder): Promise<ChangeOrder> => updateDocumentData('changeOrders', data);
export const deleteChangeOrder = (id: string): Promise<void> => deleteDocumentData('changeOrders', id);

// --- Custody ---
export const getCustodies = (): Promise<Custody[]> => getCollectionData('custodies');
export const addCustody = (data: Omit<Custody, 'id'>): Promise<Custody> => addDocumentData('custodies', data);
export const updateCustody = (data: Custody): Promise<Custody> => updateDocumentData('custodies', data);
export const deleteCustody = (id: string): Promise<void> => deleteDocumentData('custodies', id);

// --- Budget Lines (Project-specific) ---
export const getBudgetLinesForProject = async (projectId: string): Promise<BudgetLine[]> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) return [];
    const q = query(collection(firebaseServices.db, 'budgetLines'), where("projectId", "==", projectId));
    return getCollectionData('budgetLines', q);
};
export const addBudgetLine = (data: Omit<BudgetLine, 'id'>): Promise<BudgetLine> => addDocumentData('budgetLines', data);
export const updateBudgetLine = (data: BudgetLine): Promise<BudgetLine> => updateDocumentData('budgetLines', data);
export const deleteBudgetLine = (id: string): Promise<void> => deleteDocumentData('budgetLines', id);

// --- Supplier Bills ---
export const getSupplierBills = (): Promise<SupplierBill[]> => getCollectionData('supplierBills');
export const addSupplierBill = (data: Omit<SupplierBill, 'id'>): Promise<SupplierBill> => addDocumentData('supplierBills', data);
export const updateSupplierBill = (data: SupplierBill): Promise<SupplierBill> => updateDocumentData('supplierBills', data);
export const deleteSupplierBill = (id: string): Promise<void> => deleteDocumentData('supplierBills', id);

// --- Tasks (Project-specific) ---
export const getTasksForProject = async (projectId: string): Promise<ProjectTask[]> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) return [];
    const q = query(collection(firebaseServices.db, 'tasks'), where("projectId", "==", projectId));
    return getCollectionData('tasks', q);
};
export const addTask = (data: Omit<ProjectTask, 'id'>): Promise<ProjectTask> => addDocumentData('tasks', data);
export const updateTask = (data: ProjectTask): Promise<ProjectTask> => updateDocumentData('tasks', data);
export const deleteTask = (id: string): Promise<void> => deleteDocumentData('tasks', id);

// --- Subcontracts ---
export const getSubcontracts = (): Promise<Subcontract[]> => getCollectionData('subcontracts');
export const getSubcontractById = (id: string): Promise<Subcontract | undefined> => getDocumentData('subcontracts', id);
export const addSubcontract = (data: Omit<Subcontract, 'id'>): Promise<Subcontract> => addDocumentData('subcontracts', data);
export const updateSubcontract = (data: Subcontract): Promise<Subcontract> => updateDocumentData('subcontracts', data);
export const deleteSubcontract = (id: string): Promise<void> => deleteDocumentData('subcontracts', id);

// --- Subcontractor Payments ---
export const getAllSubcontractorPayments = (): Promise<SubcontractorPayment[]> => getCollectionData('subcontractorPayments');
export const getSubcontractorPayments = async (subcontractId: string): Promise<SubcontractorPayment[]> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) return [];
    const q = query(collection(firebaseServices.db, 'subcontractorPayments'), where("subcontractId", "==", subcontractId));
    return getCollectionData('subcontractorPayments', q);
};
export const addSubcontractorPayment = (data: Omit<SubcontractorPayment, 'id'>): Promise<SubcontractorPayment> => addDocumentData('subcontractorPayments', data);
export const updateSubcontractorPayment = (data: SubcontractorPayment): Promise<SubcontractorPayment> => updateDocumentData('subcontractorPayments', data);
export const deleteSubcontractorPayment = (id: string): Promise<void> => deleteDocumentData('subcontractorPayments', id);

// --- Attachments ---
export const getAttachments = async (relatedId: string, relatedType: string): Promise<Attachment[]> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) return [];
    const q = query(collection(firebaseServices.db, 'attachments'), where("relatedId", "==", relatedId), where("relatedType", "==", relatedType));
    return getCollectionData('attachments', q);
};

export const addAttachment = async (file: File, relatedId: string, relatedType: string): Promise<Attachment> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) throw new Error("Firebase not initialized");
    
    const storagePath = `attachments/${relatedType}/${relatedId}/${Date.now()}_${file.name}`;
    const storageRef = ref(firebaseServices.storage, storagePath);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    const attachmentData: Omit<Attachment, 'id'> = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        url: downloadURL,
        storagePath: snapshot.ref.fullPath,
        relatedId: relatedId,
        relatedType: relatedType,
        uploadedAt: new Date().toISOString()
    };
    
    return await addDocumentData('attachments', attachmentData);
};

export const deleteAttachment = async (id: string): Promise<void> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) throw new Error("Firebase not initialized");

    const attachmentDoc = await getDocumentData<Attachment>('attachments', id);
    if (attachmentDoc && attachmentDoc.storagePath) {
        const storageRef = ref(firebaseServices.storage, attachmentDoc.storagePath);
        await deleteObject(storageRef);
    }
    await deleteDocumentData('attachments', id);
};

// --- Assets ---
export const getAssets = (): Promise<Asset[]> => getCollectionData('assets');
export const addAsset = (data: Omit<Asset, 'id'>): Promise<Asset> => addDocumentData('assets', data);
export const updateAsset = (data: Asset): Promise<Asset> => updateDocumentData('assets', data);
export const deleteAsset = (id: string): Promise<void> => deleteDocumentData('assets', id);

// --- Documents ---
export const getDocuments = (): Promise<Document[]> => getCollectionData('documents');

export const addDocument = async (file: File, data: Omit<Document, 'id' | 'fileName' | 'fileType' | 'fileSize' | 'url' | 'uploadedAt' | 'storagePath'>): Promise<Document> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) throw new Error("Firebase not initialized");
    
    const storagePath = `documents/${Date.now()}_${file.name}`;
    const storageRef = ref(firebaseServices.storage, storagePath);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    const documentData: Omit<Document, 'id'> = {
        ...data,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        url: downloadURL,
        storagePath: snapshot.ref.fullPath,
        uploadedAt: new Date().toISOString()
    };

    return await addDocumentData('documents', documentData);
};

export const updateDocument = (data: Document): Promise<Document> => updateDocumentData('documents', data);

export const deleteDocument = async (id: string): Promise<void> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) throw new Error("Firebase not initialized");
    
    const docToDelete = await getDocumentData<Document>('documents', id);
    if (docToDelete && docToDelete.storagePath) {
        const storageRef = ref(firebaseServices.storage, docToDelete.storagePath);
        await deleteObject(storageRef).catch(error => console.error("Error deleting file from storage:", error));
    }
    await deleteDocumentData('documents', id);
};


// --- Settings & Permissions (Single Docs) ---
export const getSettings = async (): Promise<SettingsData> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) return {} as SettingsData;
    try {
        const docRef = doc(firebaseServices.db, 'app_settings', 'settings');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as SettingsData : {} as SettingsData;
    } catch (error) {
        console.error(`Error fetching settings:`, error);
        return {} as SettingsData;
    }
};
export const updateSettings = async (data: SettingsData): Promise<SettingsData> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) throw new Error("Firebase not initialized");
    await setDoc(doc(firebaseServices.db, 'app_settings', 'settings'), data);
    return data;
};

export const getPermissions = async (): Promise<AllRolesPermissions> => {
     const firebaseServices = initializeFirebase();
    if (!firebaseServices) return {} as AllRolesPermissions;
    try {
        const docRef = doc(firebaseServices.db, 'app_settings', 'permissions');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() as AllRolesPermissions : {} as AllRolesPermissions;
    } catch (error) {
        console.error(`Error fetching permissions:`, error);
        return {} as AllRolesPermissions;
    }
};
export const updatePermissions = async (data: AllRolesPermissions): Promise<AllRolesPermissions> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) throw new Error("Firebase not initialized");
    await setDoc(doc(firebaseServices.db, 'app_settings', 'permissions'), data);
    return data;
};

// --- AI Features ---
export const getFinancialOverviewData = async (): Promise<FinancialOverviewData> => {
    const [projects, invoices, supplierBills, payrollRuns] = await Promise.all([
        getCollectionData<Project>('projects'),
        getCollectionData<Invoice>('invoices'),
        getCollectionData<SupplierBill>('supplierBills'),
        getCollectionData<PayrollRun>('payrollRuns'),
    ]);

    return {
      projects: projects.map(({ name, budget, spent, status, startDate, endDate }) => ({ name, budget, spent, status, startDate, endDate })),
      invoices: invoices.map(({ project, amount, status, issueDate, dueDate }) => ({ project, amount, status, issueDate, dueDate })),
      supplierBills: supplierBills.map(({ projectName, amount, status, issueDate, dueDate }) => ({ projectName, amount, status, issueDate, dueDate })),
      payrollRuns: payrollRuns.map(({ period, payDate, status, slips }) => ({ period, payDate, status, totalPaid: slips.reduce((sum, s) => sum + s.netPay, 0) })),
    };
};