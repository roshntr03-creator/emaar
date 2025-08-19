import { initializeFirebase } from './config';
import {
    collection, getDocs, getDoc, doc, addDoc, setDoc, updateDoc, deleteDoc, query, where, writeBatch
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';


import type { 
    Project, Client, Supplier, Invoice, Account, JournalVoucher, PurchaseOrder, InventoryItem, 
    User, Employee, PayrollRun, Voucher, ChangeOrder, Custody, BudgetLine, SupplierBill,
    ProjectTask, Subcontract, SubcontractorPayment, SettingsData, AllRolesPermissions, Attachment
} from '../types';

// --- Generic Helpers ---

async function getCollectionData<T extends { id: string }>(collectionName: string): Promise<T[]> {
    const firebase = initializeFirebase();
    if (!firebase) return [];
    try {
        const querySnapshot = await getDocs(collection(firebase.db, collectionName));
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
    } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        return [];
    }
}

async function getDocumentData<T extends { id: string }>(collectionName: string, id: string): Promise<T | undefined> {
    const firebase = initializeFirebase();
    if (!firebase) return undefined;
    try {
        const docRef = doc(firebase.db, collectionName, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? ({ ...docSnap.data(), id: docSnap.id } as T) : undefined;
    } catch (error) {
        console.error(`Error fetching document ${id} from ${collectionName}:`, error);
        return undefined;
    }
}

async function addDocumentData<T extends { id: string }>(collectionName: string, data: Omit<T, 'id'>, customId?: string): Promise<T> {
    const firebase = initializeFirebase();
    if (!firebase) throw new Error("Firebase not initialized");
    if (customId) {
        const docRef = doc(firebase.db, collectionName, customId);
        await setDoc(docRef, data);
        return { ...data, id: customId } as T;
    } else {
        const docRef = await addDoc(collection(firebase.db, collectionName), data);
        return { ...data, id: docRef.id } as T;
    }
}

async function updateDocumentData<T extends { id: string }>(collectionName: string, data: T): Promise<T> {
    const firebase = initializeFirebase();
    if (!firebase) throw new Error("Firebase not initialized");
    const docRef = doc(firebase.db, collectionName, data.id);
    const dataToUpdate = { ...data };
    delete (dataToUpdate as any).id; // Do not save the id field inside the document
    await updateDoc(docRef, dataToUpdate);
    return data;
}

async function deleteDocumentData(collectionName: string, id: string): Promise<void> {
    const firebase = initializeFirebase();
    if (!firebase) throw new Error("Firebase not initialized");
    await deleteDoc(doc(firebase.db, collectionName, id));
}

// --- Projects ---
export const getProjects = (): Promise<Project[]> => getCollectionData('projects');
export const getProjectById = (id: string): Promise<Project | undefined> => getDocumentData('projects', id);
export const addProject = (data: Omit<Project, 'id'>): Promise<Project> => addDocumentData('projects', data);
export const updateProject = (data: Project): Promise<Project> => updateDocumentData('projects', data);
export const deleteProject = (id: string): Promise<void> => deleteDocumentData('projects', id);

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
    const firebase = initializeFirebase();
    if (!firebase) throw new Error("Firebase not initialized");
    const batch = writeBatch(firebase.db);
    idsToDelete.forEach(accId => {
        batch.delete(doc(firebase.db, "accounts", accId));
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
    const firebase = initializeFirebase();
    if (!firebase) throw new Error("Firebase not initialized");
    
    // Start transaction-like behavior with a batch
    const batch = writeBatch(firebase.db);

    try {
        // 1. Fetch all necessary data
        const poRef = doc(firebase.db, 'purchaseOrders', poId);
        const poDoc = await getDoc(poRef);
        if (!poDoc.exists()) {
            console.error("Purchase order not found");
            return null;
        }
        const po = { ...poDoc.data(), id: poDoc.id } as PurchaseOrder;

        if (po.status !== 'approved') {
            console.error("Can only complete 'approved' orders.");
            return null;
        }

        const accountsCol = collection(firebase.db, 'accounts');
        const inventoryAccountQuery = query(accountsCol, where("code", "==", "112"));
        const payableAccountQuery = query(accountsCol, where("code", "==", "211"));

        const [inventoryAccountSnap, payableAccountSnap] = await Promise.all([
            getDocs(inventoryAccountQuery),
            getDocs(payableAccountQuery)
        ]);

        if (inventoryAccountSnap.empty || payableAccountSnap.empty) {
            console.error("Required accounts for PO completion are missing (Inventory: 112, Payables: 211)");
            return null;
        }
        const inventoryAccount = { ...inventoryAccountSnap.docs[0].data(), id: inventoryAccountSnap.docs[0].id } as Account;
        const payableAccount = { ...payableAccountSnap.docs[0].data(), id: payableAccountSnap.docs[0].id } as Account;

        // 2. Create Journal Voucher
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
        const jvRef = doc(collection(firebase.db, 'journalVouchers')); // Create new doc ref with auto-ID
        batch.set(jvRef, jvData);

        // 3. Update Inventory
        const inventoryCol = collection(firebase.db, 'inventory');
        for (const line of po.lines) {
            const itemQuery = query(inventoryCol, where("name", "==", line.description.trim()));
            const itemSnap = await getDocs(itemQuery);

            if (!itemSnap.empty) {
                const itemDoc = itemSnap.docs[0];
                const item = { ...itemDoc.data(), id: itemDoc.id } as InventoryItem;
                
                const oldTotalValue = item.quantity * item.averageCost;
                const newItemsValue = line.quantity * line.unitPrice;
                const newTotalQuantity = item.quantity + line.quantity;
                
                const newAverageCost = newTotalQuantity > 0 ? (oldTotalValue + newItemsValue) / newTotalQuantity : 0;
                
                batch.update(itemDoc.ref, { 
                    quantity: newTotalQuantity,
                    averageCost: newAverageCost
                });
            } else {
                const newItemData: Omit<InventoryItem, 'id'> = {
                    name: line.description,
                    category: 'مواد عامة',
                    quantity: line.quantity,
                    unit: 'وحدة',
                    averageCost: line.unitPrice
                };
                const newItemRef = doc(collection(firebase.db, 'inventory'));
                batch.set(newItemRef, newItemData);
            }
        }

        // 4. Update PO status
        batch.update(poRef, { 
            status: 'completed',
            journalVoucherId: jvRef.id 
        });

        // Commit all changes
        await batch.commit();

        // Return updated PO object
        return { ...po, status: 'completed', journalVoucherId: jvRef.id };

    } catch (error) {
        console.error("Error completing purchase order in Firestore:", error);
        // Don't commit the batch if an error occurs before batch.commit()
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
    const firebase = initializeFirebase();
    if (!firebase) return [];
    const q = query(collection(firebase.db, 'budgetLines'), where("projectId", "==", projectId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BudgetLine));
};
export const addBudgetLine = (data: Omit<BudgetLine, 'id'>): Promise<BudgetLine> => addDocumentData('budgetLines', data);
export const updateBudgetLine = (data: BudgetLine): Promise<BudgetLine> => updateDocumentData('budgetLines', data);
export const deleteBudgetLine = (id: string): Promise<void> => deleteDocumentData('budgetLines', id);

// --- Supplier Bills ---
export const getSupplierBills = (): Promise<SupplierBill[]> => getCollectionData('supplierBills');

// --- Tasks (Project-specific) ---
export const getTasksForProject = async (projectId: string): Promise<ProjectTask[]> => {
    const firebase = initializeFirebase();
    if (!firebase) return [];
    const q = query(collection(firebase.db, 'tasks'), where("projectId", "==", projectId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProjectTask));
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
    const firebase = initializeFirebase();
    if (!firebase) return [];
    const q = query(collection(firebase.db, 'subcontractorPayments'), where("subcontractId", "==", subcontractId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SubcontractorPayment));
};
export const addSubcontractorPayment = (data: Omit<SubcontractorPayment, 'id'>): Promise<SubcontractorPayment> => addDocumentData('subcontractorPayments', data);
export const updateSubcontractorPayment = (data: SubcontractorPayment): Promise<SubcontractorPayment> => updateDocumentData('subcontractorPayments', data);
export const deleteSubcontractorPayment = (id: string): Promise<void> => deleteDocumentData('subcontractorPayments', id);

// --- Attachments ---
export const getAttachments = async (relatedId: string, relatedType: string): Promise<Attachment[]> => {
    const firebase = initializeFirebase();
    if (!firebase) return [];
    const q = query(collection(firebase.db, 'attachments'), where("relatedId", "==", relatedId), where("relatedType", "==", relatedType));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Attachment));
};

export const addAttachment = async (file: File, relatedId: string, relatedType: string): Promise<Attachment> => {
    const firebase = initializeFirebase();
    if (!firebase) throw new Error("Firebase not initialized");

    const storagePath = `attachments/${relatedType}/${relatedId}/${Date.now()}_${file.name}`;
    const storageRef = ref(firebase.storage, storagePath);

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
    const firebase = initializeFirebase();
    if (!firebase) throw new Error("Firebase not initialized");

    // First, get the document metadata to find the storage path
    const attachmentDoc = await getDocumentData<Attachment>('attachments', id);
    if (attachmentDoc && attachmentDoc.storagePath) {
        // Delete the file from storage
        const storageRef = ref(firebase.storage, attachmentDoc.storagePath);
        await deleteObject(storageRef);
    }
    // Then, delete the metadata document from Firestore
    await deleteDocumentData('attachments', id);
};


// --- Settings & Permissions (Single Docs) ---
export const getSettings = async (): Promise<SettingsData> => {
    const firebase = initializeFirebase();
    if (!firebase) return {} as SettingsData;
    try {
        const docRef = doc(firebase.db, 'app_settings', 'settings');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? (docSnap.data() as SettingsData) : ({} as SettingsData);
    } catch (error) {
        console.error(`Error fetching settings:`, error);
        return {} as SettingsData;
    }
};
export const updateSettings = async (data: SettingsData): Promise<SettingsData> => {
    const firebase = initializeFirebase();
    if (!firebase) throw new Error("Firebase not initialized");
    await setDoc(doc(firebase.db, 'app_settings', 'settings'), data);
    return data;
};

export const getPermissions = async (): Promise<AllRolesPermissions> => {
    const firebase = initializeFirebase();
    if (!firebase) return {} as AllRolesPermissions;
     try {
        const docRef = doc(firebase.db, 'app_settings', 'permissions');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? (docSnap.data() as AllRolesPermissions) : ({} as AllRolesPermissions);
    } catch (error) {
        console.error(`Error fetching permissions:`, error);
        return {} as AllRolesPermissions;
    }
};
export const updatePermissions = async (data: AllRolesPermissions): Promise<AllRolesPermissions> => {
    const firebase = initializeFirebase();
    if (!firebase) throw new Error("Firebase not initialized");
    await setDoc(doc(firebase.db, 'app_settings', 'permissions'), data);
    return data;
};