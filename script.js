// --- 1. Konfigurasi Awal ---
const CLOUDINARY_CLOUD_NAME = 'ganti_dengan_cloud_name_anda'; // GANTI INI DENGAN NAMA CLOUD ASLI ANDA
const CLOUDINARY_UPLOAD_PRESET = 'ganti_dengan_upload_preset_anda'; // GANTI INI DENGAN UPLOAD PRESET ASLI ANDA

const firebaseConfig = {
    apiKey: "AIzaSyBVCynAyWLPqwhkEx4dR0k5J_OsL-0Q_rY",
    authDomain: "kasir-toko-70d61.firebaseapp.com",
    projectId: "kasir-toko-70d61",
    storageBucket: "kasir-toko-70d61.firebasestorage.app",
    messagingSenderId: "1057810583954",
    appId: "1:1057810583954:web:788e1058ad4a07eb84f14b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// >>> PERUBAHAN: Nonaktifkan Persistence untuk mode Online-Only
/*
db.enablePersistence({ synchronizeTabs: true })
    .then(() => { console.log("Offline persistence enabled with multi-tab sync"); })
    .catch((err) => {
        // ... (logika penanganan error persistence)
    });
*/

// >>> PERUBAHAN: Hapus kunci-kunci LOCAL_STORAGE kecuali untuk pengaturan yang masih di lokal
const LOCAL_LAST_SYNC_KEY = 'pos_last_sync'; // Ini opsional, bisa juga dihapus

// --- 2. Deklarasi Variabel Global ---
let products = [];
let transactions = [];
let pendingTransactions = [];
let purchases = []; // NEW: Tambah variabel global untuk pembelian

// >>> PERUBAHAN: Pengaturan tetap di localStorage
let settings = JSON.parse(localStorage.getItem('pos_settings')) || {
    storeName: 'Toko Maju Jaya',
    storeAddress: 'Jl. Raya No. 123, Bekasi',
    storePhone: '021-1234567',
    receiptFooter: 'Terima kasih atas kunjungan Anda!',
    printerPaperSize: '80mm',
    printPreview: 'yes',
    currencySymbol: 'Rp ',
    syncEnabled: true // Tetap ada syncEnabled untuk kontrol di UI
};

let currentTransaction = {
    id: null,
    date: null,
    items: [],
    customerName: '',
    paymentMethod: 'cash',
    amountPaid: 0,
    change: 0,
    total: 0,
    profit: 0
};

let currentPurchase = {
    id: null,
    date: null,
    supplierName: '',
    items: [],
    total: 0
};

let editingProductId = null;
let currentProductView = 'list';
let isOnline = navigator.onLine;
let syncStatusElement = document.getElementById('syncStatus');
let editingTransactionId = null;
let returnTransactionData = null; // Variabel untuk menyimpan data transaksi yang akan diretur


// --- 3. Deklarasi Elemen DOM (document.getElementById) ---
const todaySalesElement = document.getElementById('today-sales');
const todayProfitElement = document.getElementById('today-profit');
const totalProductsElement = document.getElementById('total-products');
const pendingTransactionsElement = document.getElementById('pending-transactions');
const productSearchElement = document.getElementById('product-search');
const productDisplayArea = document.getElementById('product-display-area');
const productTableView = document.getElementById('product-table-view');
const productGridView = document.getElementById('product-grid-view');
const viewListBtn = document.getElementById('view-list-btn');
const viewGridBtn = document.getElementById('view-grid-btn');
const productListElement = document.getElementById('product-list');
const transactionItemsElement = document.getElementById('transaction-items');
const transactionTotalElement = document.getElementById('transaction-total');
const savePendingBtn = document.getElementById('save-pending');
const processPaymentBtn = document.getElementById('process-payment');
const showPendingBtn = document.getElementById('show-pending');
const pendingCountElement = document.getElementById('pending-count');
const productForm = document.getElementById('product-form');
const productIdHidden = document.getElementById('product-id-hidden');
const productNameInput = document.getElementById('product-name');
const productBuyPriceInput = document.getElementById('product-buy-price');
const productSellPriceInput = document.getElementById('product-sell-price');
const productStockInput = document.getElementById('product-stock');
const productImageUpload = document.getElementById('product-image-upload');
const productImagePreview = document.querySelector('#product-image-preview img');
const productImagePreviewContainer = document.getElementById('product-image-preview');
const saveProductBtn = document.getElementById('save-product-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const productTableBody = document.getElementById('product-table-body');
const productListSearch = document.getElementById('product-list-search');
const reportStartDate = document.getElementById('report-start-date');
const reportEndDate = document.getElementById('report-end-date');
const reportProductFilter = document.getElementById('report-product-filter');
const generateReportBtn = document.getElementById('generate-report');
const downloadReportPdfBtn = document.getElementById('download-report-pdf');
const reportTotalSales = document.getElementById('report-total-sales');
const reportTotalPurchases = document.getElementById('report-total-purchases');
const reportGrossProfit = document.getElementById('report-gross-profit');
const reportTransactions = document.getElementById('report-transactions');
const reportItemProfitTable = document.getElementById('report-item-profit-table');
const reportStockTable = document.getElementById('report-stock-table');

// >>> PERUBAHAN: Hapus elemen backup/restore
// const backupProductsCheckbox = document.getElementById('backup-products');
// const backupTransactionsCheckbox = document.getElementById('backup-transactions');
// const backupPendingCheckbox = document.getElementById('backup-pending');
// const backupBtn = document.getElementById('backup-data');
// const restoreFile = document.getElementById('restore-file');
// const restoreBtn = document.getElementById('restore-data');

const pendingModal = new bootstrap.Modal(document.getElementById('pendingModal'));
const pendingTransactionsList = document.getElementById('pending-transactions-list');
const pendingCustomerNameInput = document.getElementById('pending-customer-name');
const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
const receiptContent = document.getElementById('receipt-content');
const printReceiptBtn = document.getElementById('print-receipt');
const shareReceiptImageBtn = document.getElementById('share-receipt-image');
const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
const paymentModalTotal = document.getElementById('payment-modal-total');
const paymentMethodElement = document.getElementById('payment-method');
const customerNameElement = document.getElementById('customer-name');
const amountPaidElement = document.getElementById('amount-paid');
const changeAmountElement = document.getElementById('change-amount');
const completePaymentBtn = document.getElementById('complete-payment');
const historyList = document.getElementById('history-list');
const storeNameInput = document.getElementById('store-name');
const storeAddressInput = document.getElementById('store-address');
const storePhoneInput = document.getElementById('store-phone');
const receiptFooterInput = document.getElementById('receipt-footer');
const storeSettingsForm = document.getElementById('store-settings-form');
const printerPaperSizeSelect = document.getElementById('printer-paper-size');
const printPreviewSelect = document.getElementById('print-preview');
const savePrinterSettingsBtn = document.getElementById('save-printer-settings');
const currencySymbolInput = document.getElementById('currency-symbol');
const saveOtherSettingsBtn = document.getElementById('save-other-settings');
const quickSalesBtn = document.getElementById('quick-sales');
const quickAddProductBtn = document.getElementById('quick-add-product');
const historySearchInput = document.getElementById('history-search');

// >>> NEW: Elemen untuk fitur retur
const returnModal = new bootstrap.Modal(document.getElementById('returnModal'));
const returnTransactionIdDisplay = document.getElementById('return-transaction-id-display');
const returnItemsList = document.getElementById('return-items-list');
const returnTotalDisplay = document.getElementById('return-total-display');
const processReturnBtn = document.getElementById('process-return-btn');

// >>> NEW: Elemen untuk fitur pembelian
const quickAddPurchaseBtn = document.getElementById('quick-add-purchase');
const purchaseSupplierNameInput = document.getElementById('purchase-supplier-name');
const purchaseSearchProductInput = document.getElementById('purchase-search-product');
const purchaseItemsElement = document.getElementById('purchase-items');
const purchaseTotalElement = document.getElementById('purchase-total');
const savePurchaseBtn = document.getElementById('save-purchase-btn');
const purchaseProductListElement = document.getElementById('purchase-product-list');
const purchaseHistorySearchInput = document.getElementById('purchase-history-search');
const purchaseHistoryList = document.getElementById('purchase-history-list');
const purchaseReceiptModal = new bootstrap.Modal(document.getElementById('purchaseReceiptModal'));
const purchaseReceiptContent = document.getElementById('purchase-receipt-content');
const printPurchaseReceiptBtn = document.getElementById('print-purchase-receipt');
const sharePurchaseReceiptImageBtn = document.getElementById('share-purchase-receipt-image');


// --- 4. DEFINISI FUNGSI PEMBANTU (HELPER FUNCTIONS) ---
// >>> PERUBAHAN PENTING: loadSettings dipindahkan ke sini agar terdefinisi sebelum dipanggil init()
function loadSettings() {
    // Pastikan elemen DOM sudah ada sebelum mengaksesnya
    if (storeNameInput) storeNameInput.value = settings.storeName;
    if (storeAddressInput) storeAddressInput.value = settings.storeAddress;
    if (storePhoneInput) storePhoneInput.value = settings.storePhone;
    if (receiptFooterInput) receiptFooterInput.value = settings.receiptFooter;
    if (printerPaperSizeSelect) printerPaperSizeSelect.value = settings.printerPaperSize;
    if (printPreviewSelect) printPreviewSelect.value = settings.printPreview;
    if (currencySymbolInput) currencySymbolInput.value = settings.currencySymbol;

    const cardBodySettings = document.querySelector('#settings .card-body');
    if (cardBodySettings) {
        const existingSyncToggle = cardBodySettings.querySelector('#sync-enabled');
        if (!existingSyncToggle) { // Pastikan hanya ditambahkan sekali
            const syncToggleContainer = document.createElement('div');
            syncToggleContainer.className = 'mb-3 form-check form-switch';
            syncToggleContainer.innerHTML = `
                <input class="form-check-input" type="checkbox" id="sync-enabled" ${settings.syncEnabled ? 'checked' : ''}>
                <label class="form-check-label" for="sync-enabled">Sinkronisasi Online (Membutuhkan Firebase)</label>
            `;
            cardBodySettings.insertBefore(syncToggleContainer, cardBodySettings.firstChild);
        }

        // Pastikan event listener dipasang setelah elemen ada
        const syncEnabledCheckbox = document.getElementById('sync-enabled');
        if (syncEnabledCheckbox) {
            syncEnabledCheckbox.addEventListener('change', function() {
                settings.syncEnabled = this.checked;
                localStorage.setItem('pos_settings', JSON.stringify(settings));
                if (this.checked && isOnline) {
                    syncData();
                } else if (!this.checked) {
                    alert("Sinkronisasi online dinonaktifkan. Aplikasi ini didesain untuk online-only dan tidak akan berfungsi tanpa koneksi Firebase. Harap aktifkan kembali.");
                }
            });
        }
    }
}

function updateSyncStatus() {
    if (syncStatusElement) { // Pastikan elemen ada
        if (isOnline) {
            syncStatusElement.innerHTML = '<i class="bi bi-wifi"></i> Online Mode';
            syncStatusElement.className = 'sync-status online';
        } else {
            syncStatusElement.innerHTML = '<i class="bi bi-wifi-off"></i> Offline Mode';
            syncStatusElement.className = 'sync-status offline';
        }
    }
}

function generateId() {
    return 'firebase_' + Date.now().toString() + '_' + Math.floor(Math.random() * 1000);
}

function formatCurrency(amount) {
    return settings.currencySymbol + parseFloat(amount).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatNumberForInput(amount) {
    return parseFloat(amount).toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getPaymentMethodName(method) {
    const methods = {
        'cash': 'Tunai',
        'debit': 'Kartu Debit',
        'credit': 'Kartu Kredit',
        'transfer': 'Transfer Bank'
    };
    return methods[method] || method;
}

function resetCurrentTransaction() {
    currentTransaction = {
        id: generateId(),
        date: null,
        items: [],
        customerName: '',
        paymentMethod: 'cash',
        amountPaid: 0,
        change: 0,
        total: 0,
        profit: 0
    };
    if (paymentMethodElement) paymentMethodElement.value = 'cash';
    if (customerNameElement) customerNameElement.value = '';
    if (amountPaidElement) amountPaidElement.value = '0';
    if (changeAmountElement) changeAmountElement.textContent = '0';
    if (pendingCustomerNameInput) pendingCustomerNameInput.value = '';
    updateTransactionDisplay();
}

// >>> NEW: Reset current purchase
function resetCurrentPurchase() {
    currentPurchase = {
        id: generateId(),
        date: null,
        supplierName: '',
        items: [],
        total: 0
    };
    if (purchaseSupplierNameInput) purchaseSupplierNameInput.value = '';
    updatePurchaseDisplay();
}

function updatePendingCount() {
    if (pendingCountElement) pendingCountElement.textContent = pendingTransactions.length;
}

function calculateChange() {
    const amountPaid = parseFloat(amountPaidElement.value.replace(/[^0-9.]/g,"")) || 0;
    const change = amountPaid - currentTransaction.total;
    currentTransaction.amountPaid = amountPaid;
    currentTransaction.change = change > 0 ? change : 0;
    currentTransaction.paymentMethod = paymentMethodElement.value;
    currentTransaction.customerName = customerNameElement.value;
    if (changeAmountElement) changeAmountElement.textContent = formatCurrency(currentTransaction.change);
}

// >>> PERUBAHAN: Fungsi Sinkronisasi (hanya fetch dari Firebase)
async function syncData() {
    isOnline = navigator.onLine; // Perbarui status online
    if (!isOnline) {
        console.log("Sync skipped: offline.");
        updateSyncStatus();
        alert("Anda sedang offline. Aplikasi tidak dapat memuat data.");
        return;
    }

    console.log('Initiating data sync (refreshing data from server)...');
    try {
        if (syncStatusElement) {
            syncStatusElement.innerHTML = '<i class="bi bi-arrow-repeat"></i> Syncing...';
            syncStatusElement.className = 'sync-status syncing';
        }

        await fetchProducts();
        await fetchTransactions();
        await fetchPendingTransactions();
        await fetchPurchases(); // >>> NEW: Fetch pembelian

        localStorage.setItem(LOCAL_LAST_SYNC_KEY, new Date().toISOString());

        updateSyncStatus();
        console.log('Data refreshed from server successfully.');
    } catch (error) {
        console.error('Error during syncData (refresh):', error);
        updateSyncStatus(); // Akan menunjukkan offline/sync error
        alert("Terjadi kesalahan saat sinkronisasi data (refresh). Pastikan koneksi internet Anda aktif dan aturan Firebase benar. Detail: " + error.message);
    }
}

// >>> PERUBAHAN: Fungsi Fetch data dari Firebase (tanpa Local Storage)
async function fetchProducts() {
    try {
        const productsCol = db.collection('products');
        const snapshot = await productsCol.get({ source: 'server' }); 
        products = snapshot.docs.map(doc => {
            const data = doc.data();
            data.buyPrice = parseFloat(data.buyPrice) || 0;
            data.sellPrice = parseFloat(data.sellPrice) || 0;
            data.stock = parseInt(data.stock) || 0;
            return { id: doc.id, ...data };
        });
        console.log("Produk berhasil diambil dari Firebase.");
        
        loadProducts(productSearchElement ? productSearchElement.value : '', currentProductView);
        populateProductFilterDropdown();
        loadDashboard();
        loadPurchaseProducts(purchaseSearchProductInput ? purchaseSearchProductInput.value : ''); // >>> NEW: Muat produk untuk pembelian
    } catch (error) {
        console.error("Error fetching products from Firebase:", error);
        products = []; 
        loadProducts(productSearchElement ? productSearchElement.value : '', currentProductView);
        populateProductFilterDropdown();
        loadDashboard();
        loadPurchaseProducts(purchaseSearchProductInput ? purchaseSearchProductInput.value : ''); // >>> NEW: Muat produk untuk pembelian
        throw new Error("Gagal memuat produk dari database Firebase."); // Lempar error agar syncData menangkapnya
    }
}

async function fetchTransactions() {
    try {
        const transactionsCol = db.collection('transactions');
        const snapshot = await transactionsCol.orderBy('date', 'desc').get({ source: 'server' }); 
        
        transactions = snapshot.docs.map(doc => {
            const data = doc.data();
            if (data.date && typeof data.date.toDate === 'function') {
                data.date = data.date.toDate().toISOString();
            } else if (data.date) {
                const dateObject = new Date(data.date);
                if (!isNaN(dateObject.getTime())) {
                    data.date = dateObject.toISOString();
                } else {
                    console.warn("Transaksi dengan ID", doc.id, "memiliki nilai tanggal tidak valid (bukan Timestamp atau format salah):", data.date);
                    data.date = null;
                }
            } else {
                data.date = null;
            }
            return { id: doc.id, ...data };
        }).filter(t => t.date !== null);

        console.log("Transaksi berhasil diambil dari Firebase.");

        loadHistory(historySearchInput ? historySearchInput.value : '');
        loadDashboard();
    } catch (error) {
        console.error("Error fetching transactions from Firebase:", error);
        transactions = [];
        loadHistory(historySearchInput ? historySearchInput.value : '');
        loadDashboard();
        throw new Error("Gagal memuat transaksi dari database Firebase.");
    }
}

async function fetchPendingTransactions() {
    try {
        const pendingCol = db.collection('pendingTransactions');
        const snapshot = await pendingCol.get({ source: 'server' }); 
        
        pendingTransactions = snapshot.docs.map(doc => {
            const data = doc.data();
            if (data.date && typeof data.date.toDate === 'function') {
                data.date = data.date.toDate().toISOString();
            } else if (data.date) {
                const dateObject = new Date(data.date);
                if (!isNaN(dateObject.getTime())) {
                    data.date = dateObject.toISOString();
                } else {
                    console.warn("Transaksi pending dengan ID", doc.id, "memiliki nilai tanggal tidak valid (bukan Timestamp atau format salah):", data.date);
                    data.date = null;
                }
            } else {
                data.date = null;
            }
            return { id: doc.id, ...data };
        }).filter(t => t.date !== null);

        console.log("Transaksi pending berhasil diambil dari Firebase.");
        
        updatePendingCount();
        loadDashboard();
    } catch (error) {
        console.error("Error fetching pending transactions from Firebase:", error);
        pendingTransactions = [];
        updatePendingCount();
        loadDashboard();
        throw new Error("Gagal memuat transaksi pending dari database Firebase.");
    }
}

// >>> NEW: Fetch Pembelian
async function fetchPurchases() {
    try {
        const purchasesCol = db.collection('purchases');
        const snapshot = await purchasesCol.orderBy('date', 'desc').get({ source: 'server' }); 
        
        purchases = snapshot.docs.map(doc => {
            const data = doc.data();
            if (data.date && typeof data.date.toDate === 'function') {
                data.date = data.date.toDate().toISOString();
            } else if (data.date) {
                const dateObject = new Date(data.date);
                if (!isNaN(dateObject.getTime())) {
                    data.date = dateObject.toISOString();
                } else {
                    console.warn("Pembelian dengan ID", doc.id, "memiliki nilai tanggal tidak valid:", data.date);
                    data.date = null;
                }
            } else {
                data.date = null;
            }
            return { id: doc.id, ...data };
        }).filter(p => p.date !== null);

        console.log("Pembelian berhasil diambil dari Firebase.");
        
        loadPurchaseHistory(purchaseHistorySearchInput ? purchaseHistorySearchInput.value : '');
    } catch (error) {
        console.error("Error fetching purchases from Firebase:", error);
        purchases = [];
        loadPurchaseHistory(purchaseHistorySearchInput ? purchaseHistorySearchInput.value : '');
        throw new Error("Gagal memuat riwayat pembelian dari database Firebase.");
    }
}

// >>> PERUBAHAN: Fungsi Save/Delete data ke Firebase (tanpa Local Storage)
async function saveProductToFirestore(productData, productId = null) {
    try {
        productData.updatedAt = new Date().toISOString();

        let currentId = productId;
        if (!currentId) {
            currentId = generateId();
            productData.createdAt = new Date().toISOString();
        } else {
            const existingProduct = products.find(p => p.id === currentId);
            if (existingProduct) {
                productData.createdAt = existingProduct.createdAt || new Date().toISOString();
            } else {
                productData.createdAt = new Date().toISOString();
            }
        }
        
        try {
            const productsCol = db.collection('products');
            await productsCol.doc(currentId).set(productData, { merge: true });
            console.log("Produk berhasil disimpan ke Firebase:", currentId);
        } catch (firebaseErr) {
            console.error("Firebase Error: Gagal menyimpan produk ke Firestore:", firebaseErr);
            throw new Error("Gagal menyimpan produk ke Firebase.");
        }

        await fetchProducts(); 
        return true;
    } catch (error) {
        console.error("Critical Error in saveProductToFirestore:", error);
        alert("Terjadi kesalahan fatal saat menyimpan produk. Periksa konsol untuk detail: " + error.message);
        return false;
    }
}

async function deleteProductFromFirestore(productId) {
    try {
        products = products.filter(p => p.id !== productId); // Hapus dari memori lokal (akan ditimpa oleh fetch)
        try {
            await db.collection('products').doc(productId).delete();
            console.log("Produk berhasil dihapus dari Firebase:", productId);
        } catch (firebaseErr) {
            console.error("Firebase Error: Gagal menghapus produk dari Firestore:", firebaseErr);
            throw new Error("Gagal menghapus produk dari Firebase.");
        }
        await fetchProducts(); 
        return true;
    } catch (error) {
        console.error("Critical Error in deleteProductFromFirestore:", error);
        alert("Terjadi kesalahan fatal saat menghapus produk. Periksa konsol untuk detail: " + error.message);
        return false;
    }
}

async function saveTransactionToFirestore(transactionData) {
    try {
        transactionData.id = transactionData.id || generateId();
        transactionData.date = transactionData.date || new Date().toISOString();
        transactionData.updatedAt = new Date().toISOString();

        try {
            await db.collection('transactions').doc(transactionData.id).set(transactionData);
            console.log("Transaksi berhasil disimpan ke Firebase:", transactionData.id);
        } catch (firebaseErr) {
            console.error("Firebase Error: Gagal menyimpan transaksi ke Firestore:", firebaseErr);
            throw new Error("Gagal menyimpan transaksi ke Firebase.");
        }
        await fetchTransactions(); 
        return true;
    } catch (error) {
        console.error("Critical Error in saveTransactionToFirestore:", error);
        alert("Terjadi kesalahan fatal saat menyimpan transaksi. Periksa konsol untuk detail: " + error.message);
        return false;
    }
}

async function savePendingTransactionToFirestore(transactionData, pendingId = null) {
    try {
        let currentId = pendingId;
        if (!currentId) {
            currentId = generateId();
            transactionData.date = new Date().toISOString();
        }
        transactionData.updatedAt = new Date().toISOString();

        try {
            const pendingCol = db.collection('pendingTransactions');
            await pendingCol.doc(currentId).set(transactionData, { merge: true });
            console.log("Transaksi pending berhasil disimpan ke Firebase:", currentId);
        } catch (firebaseErr) {
            console.error("Firebase Error: Gagal menyimpan transaksi pending ke Firestore:", firebaseErr);
            throw new Error("Gagal menyimpan transaksi pending ke Firebase.");
        }
        await fetchPendingTransactions(); 
        return true;
    } catch (error) {
        console.error("Critical Error in savePendingTransactionToFirestore:", error);
        alert("Terjadi kesalahan fatal saat menyimpan transaksi pending. Periksa konsol untuk detail: " + error.message);
        return false;
    }
}

async function deletePendingTransactionFromFirestore(pendingId) {
    try {
        pendingTransactions = pendingTransactions.filter(t => t.id !== pendingId); // Hapus dari memori lokal (akan ditimpa oleh fetch)
        try {
            await db.collection('pendingTransactions').doc(pendingId).delete();
            console.log("Transaksi pending berhasil dihapus dari Firebase:", pendingId);
        } catch (firebaseErr) {
            console.error("Firebase Error: Gagal menghapus transaksi pending dari Firestore:", firebaseErr);
            throw new Error("Gagal menghapus transaksi pending dari Firebase.");
        }
        await fetchPendingTransactions(); 
        return true;
    } catch (error) {
        console.error("Critical Error in deletePendingTransactionFromFirestore:", error);
        alert("Terjadi kesalahan fatal saat menghapus transaksi pending. Periksa konsol untuk detail: " + error.message);
        return false;
    }
}

// >>> NEW: Fungsi Save Purchase to Firestore
async function savePurchaseToFirestore(purchaseData) {
    try {
        purchaseData.id = purchaseData.id || generateId();
        purchaseData.date = purchaseData.date || new Date().toISOString();
        purchaseData.updatedAt = new Date().toISOString();

        try {
            await db.collection('purchases').doc(purchaseData.id).set(purchaseData);
            console.log("Pembelian berhasil disimpan ke Firebase:", purchaseData.id);
        } catch (firebaseErr) {
            console.error("Firebase Error: Gagal menyimpan pembelian ke Firestore:", firebaseErr);
            throw new Error("Gagal menyimpan pembelian ke Firebase.");
        }
        await fetchPurchases(); // Muat ulang riwayat pembelian
        return true;
    } catch (error) {
        console.error("Critical Error in savePurchaseToFirestore:", error);
        alert("Terjadi kesalahan fatal saat menyimpan pembelian. Periksa konsol untuk detail: " + error.message);
        return false;
    }
}

// Fungsi Pemuatan UI
function loadDashboard() {
    const today = new Date().toISOString().split('T')[0];

    const todayTransactions = transactions.filter(t => {
        if (!t || !t.date) {
            console.warn("Melewatkan transaksi karena objek atau tanggal tidak valid:", t);
            return false;
        }
        const transactionDate = new Date(t.date);
        if (isNaN(transactionDate.getTime())) {
            console.warn("Melewatkan transaksi karena nilai tanggal tidak valid:", t.date);
            return false;
        }
        return transactionDate.toISOString().split('T')[0] === today;
    });
    const todaySales = todayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
    const todayProfit = todayTransactions.reduce((sum, t) => sum + (t.profit || 0), 0);

    if (todaySalesElement) todaySalesElement.textContent = formatCurrency(todaySales);
    if (todayProfitElement) todayProfitElement.textContent = formatCurrency(todayProfit);
    if (totalProductsElement) totalProductsElement.textContent = products.length;
    if (pendingTransactionsElement) pendingTransactionsElement.textContent = pendingTransactions.length;
}

function loadProducts(searchTerm = '', view = 'list') {
    if (!productListElement || !productGridView || !productTableView || !productTableBody) return; // Tambahkan cek null

    currentProductView = view;

    productListElement.innerHTML = '';
    productGridView.innerHTML = '';

    const filteredProducts = products.filter(p =>
        p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())); // Tambah cek null untuk p.name

    if (filteredProducts.length === 0) {
        if (view === 'list') {
            productTableView.style.display = 'block';
            productGridView.style.display = 'none';
            productListElement.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada produk</td></tr>';
        } else {
            productTableView.style.display = 'none';
            productGridView.style.display = 'grid';
            productGridView.innerHTML = '<p class="text-center w-100">Tidak ada produk</p>';
        }
        productTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada produk</td></tr>';
        return;
    }

    if (view === 'list') {
        productTableView.style.display = 'block';
        productGridView.style.display = 'none';
        filteredProducts.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${formatCurrency(product.sellPrice)}</td>
                <td>${product.stock}</td>
                <td>
                    <button class="btn btn-sm btn-primary add-to-cart" data-id="${product.id}">
                        <i class="bi bi-cart-plus"></i> Tambah
                    </button>
                </td>
            `;
            productListElement.appendChild(row);
        });
    } else {
        productTableView.style.display = 'none';
        productGridView.style.display = 'grid';
        filteredProducts.forEach(product => {
            const card = document.createElement('div');
            card.classList.add('product-card');
            card.innerHTML = `
                <div class="product-card-img-container">
                    ${product.image ? `<img src="${product.image}" class="product-card-img" alt="${product.name}">` : '<i class="bi bi-image-fill text-muted fs-1"></i>'}
                </div>
                <div class="product-card-body">
                    <h6>${product.name}</h6>
                    <p class="text-primary fw-bold mb-1">${formatCurrency(product.sellPrice)}</p>
                    <p class="small text-muted mb-2">Stok: ${product.stock}</p>
                    <button class="btn btn-primary add-to-cart" data-id="${product.id}">
                        <i class="bi bi-cart-plus"></i> Tambah
                    </button>
                </div>
            `;
            productGridView.appendChild(card);
        });
    }

    productTableBody.innerHTML = '';
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                ${product.image ? `<img src="${product.image}" class="product-img" alt="${product.name}">` : '<i class="bi bi-image text-muted"></i>'}
            </td>
            <td>${product.name}</td>
            <td>${formatCurrency(product.buyPrice)}</td>
            <td>${formatCurrency(product.sellPrice)}</td>
            <td>${product.stock}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1 edit-product" data-id="${product.id}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-product" data-id="${product.id}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        productTableBody.appendChild(row);
    });

    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            addToCart(productId);
        });
    });

    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            editProduct(productId);
        });
    });

    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            deleteProduct(productId);
        });
    });
}

function loadHistory(searchTerm = '') {
    if (!historyList) return; // Tambahkan cek null

    historyList.innerHTML = '';

    const filteredHistory = transactions.filter(transaction => {
        const idMatch = transaction.id && transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
        const customerNameMatch = (transaction.customerName && transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
        const itemNamesMatch = transaction.items && transaction.items.some(item => item.namaBarang && item.namaBarang.toLowerCase().includes(searchTerm.toLowerCase()));

        return idMatch || customerNameMatch || itemNamesMatch;
    });

    if (filteredHistory.length === 0) {
        historyList.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada transaksi yang cocok dengan pencarian Anda.</td></tr>';
        return;
    }

    filteredHistory.forEach(transaction => {
        const row = document.createElement('tr');
        const formattedDate = transaction.date ? new Date(transaction.date).toLocaleString('id-ID') : 'Tanggal Tidak Valid';
        const customerNameDisplay = transaction.customerName ? transaction.customerName : '-';

        row.innerHTML = `
            <td class="transaction-id">#${transaction.id}</td>
            <td class="transaction-date">${formattedDate}</td>
            <td class="transaction-customer">${customerNameDisplay}</td>
            <td class="transaction-items">${transaction.items.length} items</td>
            <td class="transaction-total">${formatCurrency(transaction.total)}</td>
            <td>
                <button class="btn btn-sm btn-info view-receipt me-1" data-id="${transaction.id}">
                    <i class="bi bi-receipt"></i> Lihat
                </button>
                <button class="btn btn-sm btn-warning me-1 edit-history-btn" data-id="${transaction.id}">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger return-transaction-btn" data-id="${transaction.id}">
                    <i class="bi bi-arrow-return-left"></i> Retur
                </button>
            </td>
        `;
        historyList.appendChild(row);
    });

    document.querySelectorAll('.view-receipt').forEach(btn => {
        btn.addEventListener('click', function() {
            const transactionId = this.getAttribute('data-id');
            viewReceipt(transactionId);
        });
    });

    document.querySelectorAll('.edit-history-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const transactionId = this.getAttribute('data-id');
            editHistory(transactionId);
        });
    });

    // >>> NEW: Event listener untuk tombol retur
    document.querySelectorAll('.return-transaction-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const transactionId = this.getAttribute('data-id');
            showReturnModal(transactionId);
        });
    });
}

// >>> NEW: Fungsi untuk menampilkan modal retur
function showReturnModal(transactionId) {
    returnTransactionData = transactions.find(t => t.id === transactionId);
    if (!returnTransactionData) {
        alert('Transaksi tidak ditemukan untuk retur!');
        return;
    }

    if (returnTransactionIdDisplay) returnTransactionIdDisplay.textContent = returnTransactionData.id;
    if (returnItemsList) returnItemsList.innerHTML = '';

    let currentReturnTotal = 0;

    returnTransactionData.items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="form-check-input return-item-checkbox" data-index="${index}" checked>
            </td>
            <td>${item.namaBarang}</td>
            <td>${formatCurrency(item.hargaBarang)}</td>
            <td>${item.kuantitas}</td>
            <td>
                <input type="number" class="form-control form-control-sm return-qty-input" data-index="${index}" value="${item.kuantitas}" min="1" max="${item.kuantitas}" style="width: 80px;">
            </td>
            <td class="return-item-total">${formatCurrency(item.hargaBarang * item.kuantitas)}</td>
        `;
        if (returnItemsList) returnItemsList.appendChild(row);

        currentReturnTotal += item.hargaBarang * item.kuantitas;
    });

    if (returnTotalDisplay) returnTotalDisplay.textContent = formatCurrency(currentReturnTotal);

    // Add event listeners for checkboxes and quantity inputs in return modal
    if (returnItemsList) {
        returnItemsList.querySelectorAll('.return-item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateReturnTotal);
        });
        returnItemsList.querySelectorAll('.return-qty-input').forEach(input => {
            input.addEventListener('input', updateReturnTotal);
        });
    }

    if (returnModal) returnModal.show();
}

// >>> NEW: Fungsi untuk memperbarui total retur di modal
function updateReturnTotal() {
    let total = 0;
    if (!returnItemsList) return;

    returnItemsList.querySelectorAll('tr').forEach(row => {
        const checkbox = row.querySelector('.return-item-checkbox');
        const qtyInput = row.querySelector('.return-qty-input');
        const itemTotalElement = row.querySelector('.return-item-total');

        const index = parseInt(checkbox.getAttribute('data-index'));
        const originalItem = returnTransactionData.items[index];

        if (checkbox.checked) {
            let qty = parseInt(qtyInput.value) || 0;
            // Ensure qty doesn't exceed original quantity
            if (qty > originalItem.kuantitas) {
                qty = originalItem.kuantitas;
                qtyInput.value = qty;
            }
            if (qty < 0) { // No negative quantities
                qty = 0;
                qtyInput.value = qty;
            }
            const itemSubtotal = originalItem.hargaBarang * qty;
            total += itemSubtotal;
            if (itemTotalElement) itemTotalElement.textContent = formatCurrency(itemSubtotal);
        } else {
            if (itemTotalElement) itemTotalElement.textContent = formatCurrency(0);
            if (qtyInput) qtyInput.value = 0; // Set quantity to 0 if unchecked
        }
    });
    if (returnTotalDisplay) returnTotalDisplay.textContent = formatCurrency(total);
}

// >>> NEW: Proses retur
if (processReturnBtn) {
    processReturnBtn.addEventListener('click', async () => {
        if (!isOnline) {
            alert('Anda sedang offline. Tidak dapat memproses retur.');
            return;
        }

        if (!confirm('Anda yakin ingin memproses retur ini? Stok produk akan dikembalikan.')) {
            return;
        }

        const returnedItems = [];
        let totalReturnAmount = 0;
        let totalReturnProfitImpact = 0; // Dampak pada profit karena retur

        if (!returnItemsList) {
             alert('Daftar item retur tidak tersedia.');
             return;
        }

        for (const row of returnItemsList.querySelectorAll('tr')) {
            const checkbox = row.querySelector('.return-item-checkbox');
            if (checkbox && checkbox.checked) {
                const qtyInput = row.querySelector('.return-qty-input');
                const index = parseInt(checkbox.getAttribute('data-index'));
                const originalItem = returnTransactionData.items[index];
                const returnedQty = parseInt(qtyInput.value) || 0;

                if (returnedQty > 0) {
                    const product = products.find(p => p.id === originalItem.productId);
                    if (!product) {
                        alert(`Produk ${originalItem.namaBarang} tidak ditemukan dalam daftar produk. Retur gagal.`);
                        return;
                    }

                    // Update product stock (add back to inventory)
                    const newStock = product.stock + returnedQty;
                    const stockUpdateSuccess = await saveProductToFirestore({ stock: newStock }, product.id);
                    if (!stockUpdateSuccess) {
                        alert(`Gagal memperbarui stok untuk ${originalItem.namaBarang}. Retur dibatalkan.`);
                        return;
                    }

                    const itemReturnTotal = originalItem.hargaBarang * returnedQty;
                    const itemProfitImpact = (originalItem.hargaBarang - originalItem.buyPrice) * returnedQty;

                    returnedItems.push({
                        productId: originalItem.productId,
                        namaBarang: originalItem.namaBarang,
                        hargaBarang: originalItem.hargaBarang,
                        buyPrice: originalItem.buyPrice,
                        kuantitas: returnedQty,
                        total: itemReturnTotal
                    });
                    totalReturnAmount += itemReturnTotal;
                    totalReturnProfitImpact += itemProfitImpact;
                }
            }
        }

        if (returnedItems.length === 0) {
            alert('Tidak ada item yang dipilih untuk diretur atau kuantitas retur 0.');
            return;
        }

        // Create a new return transaction
        const returnTransaction = {
            id: generateId(),
            originalTransactionId: returnTransactionData.id,
            date: new Date().toISOString(),
            type: 'return',
            customerName: returnTransactionData.customerName || 'Pelanggan Retur',
            paymentMethod: 'cash_refund', // Atau metode pengembalian dana lainnya
            items: returnedItems,
            total: -totalReturnAmount, // Total negatif untuk retur
            profit: -totalReturnProfitImpact, // Dampak negatif pada profit
            notes: `Retur dari transaksi penjualan #${returnTransactionData.id}`
        };

        try {
            await db.collection('returns').doc(returnTransaction.id).set(returnTransaction);
            alert('Retur berhasil diproses! Stok diperbarui dan transaksi retur dicatat.');
            if (returnModal) returnModal.hide();
            await syncData(); // Refresh semua data dan UI

            // Optional: Show a return receipt
            if (purchaseReceiptContent && purchaseReceiptModal) {
                 purchaseReceiptContent.innerHTML = generateReturnReceipt(returnTransaction);
                 purchaseReceiptModal.show();
            }
        } catch (error) {
            console.error("Error saving return transaction:", error);
            alert("Gagal mencatat transaksi retur di database Firebase. Error: " + error.message);
        }
    });
}


// Fungsi Struk Retur (NEW)
function generateReturnReceipt(returnTx) {
    let itemsHTML = '';
    returnTx.items.forEach(item => {
        itemsHTML += `
            <div class="receipt-item">
                <span style="width: 60%">${item.namaBarang}</span>
                <span style="width: 15%; text-align: right">${item.kuantitas}</span>
                <span style="width: 25%; text-align: right">${formatCurrency(item.hargaBarang)}</span>
            </div>
        `;
    });

    return `
        <div class="receipt" id="printable-purchase-receipt">
            <div class="receipt-header">
                <h5>${settings.storeName}</h5>
                <p>${settings.storeAddress}</p>
                <p>Telp: ${settings.storePhone}</p>
                <hr>
                <p>No Retur: #${returnTx.id}</p>
                <p>Ref Transaksi Asli: #${returnTx.originalTransactionId}</p>
                <p>${returnTx.date ? new Date(returnTx.date).toLocaleString('id-ID', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                ${returnTx.customerName ? `<p>Pelanggan: ${returnTx.customerName}</p>` : ''}
                <p>Metode Pengembalian: ${getPaymentMethodName(returnTx.paymentMethod)}</p>
                <hr>
                <div class="receipt-item">
                    <span style="width: 60%; font-weight: bold;">Produk Retur</span>
                    <span style="width: 15%; text-align: right; font-weight: bold;">Qty</span>
                    <span style="width: 25%; text-align: right; font-weight: bold;">Harga</span>
                </div>
                <hr>
            </div>
            ${itemsHTML}
            <hr>
            <div class="receipt-total receipt-item">
                <span>TOTAL RETUR</span>
                <span>${formatCurrency(Math.abs(returnTx.total))}</span>
            </div>
            <div class="receipt-footer">
                <hr>
                <p>Terima kasih atas pengertian Anda.</p>
                <p>${settings.receiptFooter}</p>
            </div>
        </div>
    `;
}


// Fungsi Edit Histori
async function editHistory(transactionId) {
    editingTransactionId = transactionId;
    const row = Array.from(historyList.rows).find(row => row.querySelector('.view-receipt')?.getAttribute('data-id') === transactionId);
    if (!row) {
        console.error("Row not found for editing transaction ID:", transactionId);
        return;
    }

    const originalTransaction = transactions.find(t => t.id === transactionId);
    if (!originalTransaction) {
         console.error("Original transaction not found for ID:", transactionId);
         alert("Transaksi tidak ditemukan untuk diedit.");
         return;
    }

    row.classList.add('edit-row');
    const itemsCell = row.querySelector('.transaction-items');
    const totalCell = row.querySelector('.transaction-total');
    const customerCell = row.querySelector('.transaction-customer');

    if (itemsCell) itemsCell.textContent = `${originalTransaction.items.length} items`; // Tetap tampilkan jumlah item asli

    if (totalCell) totalCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${formatNumberForInput(originalTransaction.total)}">`;
    if (customerCell) customerCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${originalTransaction.customerName || ''}">`;

    const actionsCell = row.querySelector('td:last-child');
    if (actionsCell) {
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-success save-history-btn me-1" data-id="${transactionId}"><i class="bi bi-save"></i></button>
            <button class="btn btn-sm btn-secondary cancel-edit-history-btn" data-id="${transactionId}"><i class="bi bi-x"></i></button>
        `;
    }

    const saveBtn = row.querySelector('.save-history-btn');
    const cancelBtn = row.querySelector('.cancel-edit-history-btn');

    if (saveBtn) saveBtn.addEventListener('click', () => saveEditedHistory(transactionId, row));
    if (cancelBtn) cancelBtn.addEventListener('click', () => cancelEditHistory(transactionId, row));
}

async function saveEditedHistory(transactionId, row) {
    if (!isOnline) {
        alert('Anda sedang offline. Tidak dapat menyimpan perubahan riwayat.');
        return;
    }
    const totalInput = row.querySelector('.transaction-total input');
    const customerInput = row.querySelector('.transaction-customer input');

    const newTotal = parseFloat(totalInput.value.replace(/[^0-9.]/g,"")) || 0;
    const newCustomerName = customerInput.value.trim();

    const transactionToUpdate = transactions.find(t => t.id === transactionId);
    if (!transactionToUpdate) {
        console.error("Transaksi tidak ditemukan di array untuk ID:", transactionId);
        alert("Gagal menyimpan perubahan: Transaksi tidak ditemukan.");
        return;
    }

    transactionToUpdate.total = newTotal;
    transactionToUpdate.customerName = newCustomerName;
    transactionToUpdate.updatedAt = new Date().toISOString();

    try {
        await db.collection('transactions').doc(transactionId).update({
            total: newTotal,
            customerName: newCustomerName,
            updatedAt: transactionToUpdate.updatedAt
        });
        alert('Perubahan riwayat transaksi berhasil disimpan ke Firebase.');
        console.log("Transaksi histori diperbarui di Firebase:", transactionId);
    } catch (firebaseErr) {
        console.error("Firebase Error: Gagal memperbarui transaksi histori di Firestore:", firebaseErr);
        alert('Gagal menyimpan perubahan riwayat transaksi ke database Firebase. Error: ' + firebaseErr.message);
    } finally {
        await fetchTransactions(); // Refresh data dari Firebase untuk update UI
        if (row) row.classList.remove('edit-row');
        editingTransactionId = null;
        loadDashboard();
    }
}

function cancelEditHistory(transactionId, row) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction) {
        if (row.querySelector('.transaction-items')) row.querySelector('.transaction-items').textContent = `${transaction.items.length} items`;
        if (row.querySelector('.transaction-customer')) row.querySelector('.transaction-customer').textContent = transaction.customerName || '-';
        if (row.querySelector('.transaction-total')) row.querySelector('.transaction-total').textContent = formatCurrency(transaction.total);
    } else {
        console.warn("Transaksi tidak ditemukan untuk membatalkan edit:", transactionId);
        if (row.querySelector('.transaction-items')) row.querySelector('.transaction-items').textContent = `N/A items`;
        if (row.querySelector('.transaction-customer')) row.querySelector('.transaction-customer').textContent = `N/A`;
        if (row.querySelector('.transaction-total')) row.querySelector('.transaction-total').textContent = `N/A`;
    }

    const actionsCell = row.querySelector('td:last-child');
    if (actionsCell) {
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-info view-receipt me-1" data-id="${transactionId}">
                <i class="bi bi-receipt"></i> Lihat
            </button>
            <button class="btn btn-sm btn-warning me-1 edit-history-btn" data-id="${transactionId}">
                <i class="bi bi-pencil"></i> Edit
            </button>
            <button class="btn btn-sm btn-danger return-transaction-btn" data-id="${transactionId}">
                <i class="bi bi-arrow-return-left"></i> Retur
            </button>
        `;
    }
    const viewReceiptBtn = row.querySelector('.view-receipt');
    const editBtn = row.querySelector('.edit-history-btn');
    const returnBtn = row.querySelector('.return-transaction-btn');

    if (viewReceiptBtn) viewReceiptBtn.addEventListener('click', function() {
        const transactionId = this.getAttribute('data-id');
        viewReceipt(transactionId);
    });
    if (editBtn) editBtn.addEventListener('click', () => editHistory(transactionId));
    if (returnBtn) returnBtn.addEventListener('click', () => showReturnModal(transactionId));

    if (row) row.classList.remove('edit-row');
    editingTransactionId = null;
}

// Fungsi Upload Gambar
async function uploadImageToCloudinary(file) {
    if (CLOUDINARY_CLOUD_NAME === 'ganti_dengan_cloud_name_anda' || CLOUDINARY_UPLOAD_PRESET === 'ganti_dengan_upload_preset_anda') {
        console.warn('Cloudinary not configured. Image upload will not work.');
        throw new Error('Cloudinary configuration is missing. Please update CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in the code.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Upload gagal: ${errorData.error.message || response.statusText}`);
        }
        const data = await response.json();
        console.log("Image uploaded to Cloudinary:", data.secure_url);
        return data.secure_url;
    } catch (error) {
        console.error('Kesalahan unggah Cloudinary:', error);
        throw error;
    }
}

// Fungsi Edit Produk
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        console.error("Produk tidak ditemukan untuk diedit:", productId);
        return;
    }
    editingProductId = productId;
    if (productIdHidden) productIdHidden.value = product.id;
    if (productNameInput) productNameInput.value = product.name;
    if (productBuyPriceInput) productBuyPriceInput.value = product.buyPrice;
    if (productSellPriceInput) productSellPriceInput.value = product.sellPrice;
    if (productStockInput) productStockInput.value = product.stock;
    if (productImageUpload) productImageUpload.value = '';

    if (product.image) {
        if (productImagePreview) productImagePreview.src = product.image;
        if (productImagePreviewContainer) productImagePreviewContainer.style.display = 'block';
    } else {
        if (productImagePreview) productImagePreview.src = '';
        if (productImagePreviewContainer) productImagePreviewContainer.style.display = 'none';
    }
    if (saveProductBtn) {
        saveProductBtn.textContent = 'Update Produk';
        saveProductBtn.classList.remove('btn-primary');
        saveProductBtn.classList.add('btn-warning');
    }
    if (cancelEditBtn) cancelEditBtn.style.display = 'block';

    const stockTabElement = document.getElementById('nav-stock-tab');
    if (stockTabElement) {
        const bsTab = new bootstrap.Tab(stockTabElement);
        bsTab.show();
    }
    if (productNameInput) productNameInput.focus();
}

function cancelEditBtnClickHandler() { // Buat fungsi terpisah untuk event listener
    editingProductId = null;
    if (productForm) productForm.reset();
    if (saveProductBtn) {
        saveProductBtn.textContent = 'Simpan Produk';
        saveProductBtn.classList.remove('btn-warning');
        saveProductBtn.classList.add('btn-primary');
    }
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
    if (productImagePreview) productImagePreview.src = '';
    if (productImagePreviewContainer) productImagePreviewContainer.style.display = 'none';
}

async function deleteProduct(productId) {
    if (!isOnline) {
        alert('Anda sedang offline. Tidak dapat menghapus produk.');
        return;
    }
    if (confirm('Hapus produk ini? Tindakan ini tidak dapat dibatalkan.')) {
        const success = await deleteProductFromFirestore(productId);
        if (success) {
            alert('Produk berhasil dihapus!');
        } else {
            alert('Gagal menghapus produk.');
        }
    }
}

// >>> NEW: Fungsi Manajemen Pembelian
function loadPurchaseProducts(searchTerm = '') {
    if (!purchaseProductListElement) return; // Tambahkan cek null

    purchaseProductListElement.innerHTML = '';
    const filteredProducts = products.filter(p =>
        p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filteredProducts.length === 0) {
        purchaseProductListElement.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada produk</td></tr>';
        return;
    }

    filteredProducts.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${formatCurrency(product.buyPrice)}</td>
            <td>${product.stock}</td>
            <td>
                <button class="btn btn-sm btn-primary add-to-purchase" data-id="${product.id}">
                    <i class="bi bi-plus-circle"></i> Tambah
                </button>
            </td>
        `;
        purchaseProductListElement.appendChild(row);
    });

    document.querySelectorAll('.add-to-purchase').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            addToPurchase(productId);
        });
    });
}

function addToPurchase(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        alert('Produk tidak ditemukan!');
        return;
    }

    const existingItem = currentPurchase.items.find(i => i.productId === productId);

    if (existingItem) {
        existingItem.kuantitas++;
        existingItem.total = existingItem.buyPrice * existingItem.kuantitas;
    } else {
        currentPurchase.items.push({
            productId: product.id,
            namaBarang: product.name,
            buyPrice: product.buyPrice,
            kuantitas: 1,
            total: product.buyPrice
        });
    }
    updatePurchaseDisplay();
}

function updatePurchaseDisplay() {
    if (!purchaseItemsElement || !purchaseTotalElement) return; // Tambahkan cek null

    purchaseItemsElement.innerHTML = '';

    if (currentPurchase.items.length === 0) {
        purchaseItemsElement.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada item pembelian</td></tr>';
        purchaseTotalElement.textContent = formatCurrency(0);
        return;
    }

    let total = 0;
    currentPurchase.items.forEach((item, index) => {
        const itemBuyPrice = parseFloat(item.buyPrice) || 0;
        item.total = itemBuyPrice * item.kuantitas;

        total += item.total;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.namaBarang}</td>
            <td>
                <input type="text" class="form-control form-control-sm purchase-price-input" value="${formatNumberForInput(itemBuyPrice)}" data-index="${index}" style="width: 100px;">
            </td>
            <td>
                <div class="input-group input-group-sm" style="width: 120px;">
                    <button class="btn btn-outline-secondary purchase-decrease-qty" data-index="${index}" type="button">-</button>
                    <input type="number" class="form-control text-center purchase-qty-input" value="${item.kuantitas}" min="1" data-index="${index}">
                    <button class="btn btn-outline-secondary purchase-increase-qty" data-index="${index}" type="button">+</button>
                </div>
            </td>
            <td>${formatCurrency(item.total)}</td>
            <td>
                <button class="btn btn-sm btn-danger purchase-remove-item" data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        purchaseItemsElement.appendChild(row);
    });

    currentPurchase.total = total;
    purchaseTotalElement.textContent = formatCurrency(total);

    document.querySelectorAll('.purchase-price-input').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const newPrice = parseFloat(this.value.replace(/[^0-9.]/g,""));
            if (!isNaN(newPrice) && newPrice >= 0) {
                currentPurchase.items[index].buyPrice = newPrice;
            } else {
                alert('Harga tidak valid!');
                this.value = formatNumberForInput(currentPurchase.items[index].buyPrice);
            }
            updatePurchaseDisplay();
        });
    });

    document.querySelectorAll('.purchase-decrease-qty').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            updatePurchaseItemQuantity(index, -1);
        });
    });

    document.querySelectorAll('.purchase-increase-qty').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            updatePurchaseItemQuantity(index, 1);
        });
    });

    document.querySelectorAll('.purchase-qty-input').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const newQty = parseInt(this.value);
            updatePurchaseItemQuantity(index, 0, newQty);
        });
    });

    document.querySelectorAll('.purchase-remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removePurchaseItem(index);
        });
    });
}

function updatePurchaseItemQuantity(index, change, newQty = null) {
    const item = currentPurchase.items[index];
    if (!item) return;

    let newQuantity = newQty !== null ? newQty : item.kuantitas + change;

    if (newQuantity < 1) newQuantity = 1;
    
    item.kuantitas = newQuantity;
    item.total = item.buyPrice * newQuantity;

    updatePurchaseDisplay();
}

function removePurchaseItem(index) {
    currentPurchase.items.splice(index, 1);
    updatePurchaseDisplay();
}

async function processNewPurchase() {
    if (currentPurchase.items.length === 0) {
        alert('Tidak ada item dalam pembelian!');
        return;
    }
    if (!isOnline) {
        alert('Anda sedang offline. Tidak dapat menyimpan pembelian ke Firebase.');
        return;
    }

    const supplierName = purchaseSupplierNameInput ? purchaseSupplierNameInput.value.trim() : '';
    currentPurchase.supplierName = supplierName;
    currentPurchase.date = new Date().toISOString();

    let allStockUpdatesSuccessful = true;
    const stockUpdatePromises = currentPurchase.items.map(async (item) => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            const newStock = product.stock + item.kuantitas; // Tambah stok
            const success = await saveProductToFirestore({ stock: newStock }, product.id);
            if (!success) {
                allStockUpdatesSuccessful = false;
            }
            return success;
        }
        return true;
    });
    await Promise.all(stockUpdatePromises);

    if (!allStockUpdatesSuccessful) {
        alert("Gagal memperbarui stok salah satu produk. Pembelian tidak dapat diselesaikan.");
        return;
    }

    const purchaseSuccess = await savePurchaseToFirestore(currentPurchase);
    if (!purchaseSuccess) {
        return;
    }

    alert('Pembelian berhasil dicatat dan stok diperbarui!');
    resetCurrentPurchase();
    await syncData(); // Refresh semua data dan UI

    // Tampilkan struk pembelian
    if (purchaseReceiptContent && purchaseReceiptModal) {
        purchaseReceiptContent.innerHTML = generatePurchaseReceipt(purchaseSuccess);
        purchaseReceiptModal.show();
    }
}

function generatePurchaseReceipt(purchaseTx) {
    let itemsHTML = '';
    purchaseTx.items.forEach(item => {
        itemsHTML += `
            <div class="receipt-item">
                <span style="width: 60%">${item.namaBarang}</span>
                <span style="width: 15%; text-align: right">${item.kuantitas}</span>
                <span style="width: 25%; text-align: right">${formatCurrency(item.buyPrice)}</span>
            </div>
            <div class="receipt-item">
                <span style="width: 60%;"></span>
                <span style="width: 15%; text-align: right"></span>
                <span style="width: 25%; text-align: right">${formatCurrency(item.total)}</span>
            </div>
        `;
    });

    return `
        <div class="receipt" id="printable-purchase-receipt">
            <div class="receipt-header">
                <h5>${settings.storeName}</h5>
                <p>${settings.storeAddress}</p>
                <p>Telp: ${settings.storePhone}</p>
                <hr>
                <p>No Pembelian: #${purchaseTx.id}</p>
                <p>${purchaseTx.date ? new Date(purchaseTx.date).toLocaleString('id-ID', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                ${purchaseTx.supplierName ? `<p>Pemasok: ${purchaseTx.supplierName}</p>` : ''}
                <hr>
                <div class="receipt-item">
                    <span style="width: 60%; font-weight: bold;">Produk</span>
                    <span style="width: 15%; text-align: right; font-weight: bold;">Qty</span>
                    <span style="width: 25%; text-align: right; font-weight: bold;">Harga Beli</span>
                </div>
                <hr>
            </div>
            ${itemsHTML}
            <hr>
            <div class="receipt-total receipt-item">
                <span>TOTAL PEMBELIAN</span>
                <span>${formatCurrency(purchaseTx.total)}</span>
            </div>
            <div class="receipt-footer">
                <hr>
                <p>${settings.receiptFooter}</p>
            </div>
        </div>
    `;
}

function loadPurchaseHistory(searchTerm = '') {
    if (!purchaseHistoryList) return; // Tambahkan cek null

    purchaseHistoryList.innerHTML = '';

    const filteredHistory = purchases.filter(purchase => {
        const idMatch = purchase.id && purchase.id.toLowerCase().includes(searchTerm.toLowerCase());
        const supplierNameMatch = (purchase.supplierName && purchase.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));
        const itemNamesMatch = purchase.items && purchase.items.some(item => item.namaBarang && item.namaBarang.toLowerCase().includes(searchTerm.toLowerCase()));

        return idMatch || supplierNameMatch || itemNamesMatch;
    });

    if (filteredHistory.length === 0) {
        purchaseHistoryList.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada riwayat pembelian yang cocok dengan pencarian Anda.</td></tr>';
        return;
    }

    filteredHistory.forEach(purchase => {
        const row = document.createElement('tr');
        const formattedDate = purchase.date ? new Date(purchase.date).toLocaleString('id-ID') : 'Tanggal Tidak Valid';
        const supplierNameDisplay = purchase.supplierName ? purchase.supplierName : '-';

        row.innerHTML = `
            <td>#${purchase.id}</td>
            <td>${formattedDate}</td>
            <td>${supplierNameDisplay}</td>
            <td>${purchase.items.length} items</td>
            <td>${formatCurrency(purchase.total)}</td>
            <td>
                <button class="btn btn-sm btn-info view-purchase-receipt" data-id="${purchase.id}">
                    <i class="bi bi-receipt"></i> Lihat
                </button>
            </td>
        `;
        purchaseHistoryList.appendChild(row);
    });

    document.querySelectorAll('.view-purchase-receipt').forEach(btn => {
        btn.addEventListener('click', function() {
            const purchaseId = this.getAttribute('data-id');
            viewPurchaseReceipt(purchaseId);
        });
    });
}

function viewPurchaseReceipt(purchaseId) {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) {
        console.error("Pembelian tidak ditemukan untuk dilihat nota-nya:", purchaseId);
        return;
    }
    if (purchaseReceiptContent && purchaseReceiptModal) {
        purchaseReceiptContent.innerHTML = generatePurchaseReceipt(purchase);
        purchaseReceiptModal.show();
    }
}


// Fungsi Khusus Report
function populateProductFilterDropdown() {
    if (!reportProductFilter) return; // Tambahkan cek null
    reportProductFilter.innerHTML = '<option value="all">Semua Produk</option>';
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        reportProductFilter.appendChild(option);
    });
}

function generateItemProfitReport(filteredTransactions, selectedProductId = 'all') {
    if (!reportItemProfitTable) return; // Tambahkan cek null
    reportItemProfitTable.innerHTML = '';
    const itemSales = {};

    filteredTransactions.forEach(transaction => {
        transaction.items.forEach(item => {
            if (selectedProductId === 'all' || item.productId === selectedProductId) {
                if (!itemSales[item.productId]) {
                    itemSales[item.productId] = {
                        name: item.namaBarang,
                        qty: 0,
                        totalSales: 0,
                        totalHPP: 0,
                        totalProfit: 0
                    };
                }
                itemSales[item.productId].qty += item.kuantitas;
                itemSales[item.productId].totalSales += item.total;
                itemSales[item.productId].totalHPP += (item.buyPrice * item.kuantitas);
                itemSales[item.productId].totalProfit += (item.hargaBarang - item.buyPrice) * item.kuantitas;
            }
        });
    });

      const sortedItems = Object.values(itemSales).sort((a, b) => b.totalSales - a.totalSales);

    if (sortedItems.length === 0) {
        reportItemProfitTable.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada data penjualan per item dalam periode ini atau untuk produk yang dipilih.</td></tr>';
    } else {
        sortedItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>${formatCurrency(item.totalSales)}</td>
                <td>${formatCurrency(item.totalHPP)}</td>
                <td>${formatCurrency(item.totalProfit)}</td>
            `;
            reportItemProfitTable.appendChild(row);
        });
    }
}

function generateStockReport(selectedProductId = 'all') {
    if (!reportStockTable) return; // Tambahkan cek null
    reportStockTable.innerHTML = '';

    let filteredProductsForStock = products;
    if (selectedProductId !== 'all') {
        filteredProductsForStock = products.filter(p => p.id === selectedProductId);
    }

    if (filteredProductsForStock.length === 0) {
        reportStockTable.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada produk dalam stok atau untuk produk yang dipilih.</td></tr>';
        return;
    }

    filteredProductsForStock.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.stock}</td>
            <td>${formatCurrency(product.buyPrice)}</td>
            <td>${formatCurrency(product.sellPrice)}</td>
        `;
        reportStockTable.appendChild(row);
    });
}

// Fungsi Transaksi & Pembayaran
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        alert('Produk tidak ditemukan!');
        return;
    }

    const existingItem = currentTransaction.items.find(i => i.productId === productId);

    if (existingItem) {
        if (existingItem.kuantitas < product.stock) {
            existingItem.kuantitas++;
            existingItem.total = existingItem.hargaBarang * existingItem.kuantitas;
        } else {
            alert('Stok tidak mencukupi!');
            return;
        }
    } else {
        if (product.stock > 0) {
            currentTransaction.items.push({
                productId: product.id,
                namaBarang: product.name,
                hargaBarang: product.sellPrice,
                kuantitas: 1,
                total: product.sellPrice,
                buyPrice: product.buyPrice
            });
        } else {
            alert('Stok habis!');
            return;
        }
    }
    updateTransactionDisplay();
}

function updateTransactionDisplay() {
    if (!transactionItemsElement || !transactionTotalElement) return; // Tambahkan cek null

    transactionItemsElement.innerHTML = '';

    if (currentTransaction.items.length === 0) {
        transactionItemsElement.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada item</td></tr>';
        transactionTotalElement.textContent = formatCurrency(0);
        return;
    }

    let total = 0;
    let profit = 0;

    currentTransaction.items.forEach((item, index) => {
        const itemPrice = parseFloat(item.hargaBarang) || 0;
        item.total = itemPrice * item.kuantitas;

        total += item.total;
        profit += (itemPrice - item.buyPrice) * item.kuantitas;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.namaBarang}</td>
            <td>
                <input type="text" class="form-control form-control-sm price-input" value="${formatNumberForInput(itemPrice)}" data-index="${index}" style="width: 100px;">
            </td>
            <td>
                <div class="input-group input-group-sm" style="width: 120px;">
                    <button class="btn btn-outline-secondary decrease-qty" data-index="${index}" type="button">-</button>
                    <input type="number" class="form-control text-center qty-input" value="${item.kuantitas}" min="1" data-index="${index}">
                    <button class="btn btn-outline-secondary increase-qty" data-index="${index}" type="button">+</button>
                </div>
            </td>
            <td>${formatCurrency(item.total)}</td>
            <td>
                <button class="btn btn-sm btn-danger remove-item" data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        transactionItemsElement.appendChild(row);
    });

    currentTransaction.total = total;
    currentTransaction.profit = profit;
    transactionTotalElement.textContent = formatCurrency(total);

    document.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const newPrice = parseFloat(this.value.replace(/[^0-9.]/g,""));
            if (!isNaN(newPrice) && newPrice >= 0) {
                currentTransaction.items[index].hargaBarang = newPrice;
            } else {
                alert('Harga tidak valid!');
                this.value = formatNumberForInput(currentTransaction.items[index].hargaBarang);
            }
            updateTransactionDisplay();
        });
    });

    document.querySelectorAll('.decrease-qty').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            updateItemQuantity(index, -1);
        });
    });

    document.querySelectorAll('.increase-qty').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            updateItemQuantity(index, 1);
        });
    });

    document.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const newQty = parseInt(this.value);
            updateItemQuantity(index, 0, newQty);
        });
    });

    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removeItemFromCart(index);
        });
    });
}

function viewReceipt(transactionId) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) {
        console.error("Transaksi tidak ditemukan untuk dilihat struknya:", transactionId);
        return;
    }
    if (receiptContent && receiptModal) {
        receiptContent.innerHTML = generateReceipt(transaction);
        receiptModal.show();
    }
}

function generateReceipt(transaction) {
    let itemsHTML = '';
    transaction.items.forEach(item => {
        itemsHTML += `
            <div class="receipt-item">
                <span style="width: 60%">${item.namaBarang}</span>
                <span style="width: 15%; text-align: right">${item.kuantitas}</span>
                <span style="width: 25%; text-align: right">${formatCurrency(item.hargaBarang)}</span>
            </div>
            <div class="receipt-item">
                <span style="width: 60%;"></span>
                <span style="width: 15%; text-align: right"></span>
                <span style="width: 25%; text-align: right">${formatCurrency(item.total)}</span>
            </div>
        `;
    });

    return `
        <div class="receipt" id="printable-receipt">
            <div class="receipt-header">
                <h5>${settings.storeName}</h5>
                <p>${settings.storeAddress}</p>
                <p>Telp: ${settings.storePhone}</p>
                <hr>
                <p>No: #${transaction.id}</p>
                <p>${transaction.date ? new Date(transaction.date).toLocaleString('id-ID', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                ${transaction.customerName ? `<p>Pelanggan: ${transaction.customerName}</p>` : ''}
                <p>Metode: ${getPaymentMethodName(transaction.paymentMethod)}</p>
                <hr>
                <div class="receipt-item">
                    <span style="width: 60%; font-weight: bold;">Produk</span>
                    <span style="width: 15%; text-align: right; font-weight: bold;">Qty</span>
                    <span style="width: 25%; text-align: right; font-weight: bold;">Harga</span>
                </div>
                <hr>
            </div>
            ${itemsHTML}
            <hr>
            <div class="receipt-total receipt-item">
                <span>TOTAL</span>
                <span>${formatCurrency(transaction.total)}</span>
            </div>
            <div class="receipt-item">
                <span>DIBAYAR</span>
                <span>${formatCurrency(transaction.amountPaid)}</span>
            </div>
            <div class="receipt-item">
                <span>KEMBALI</span>
                <span>${formatCurrency(transaction.change)}</span>
            </div>
            <div class="receipt-footer">
                <hr>
                <p>${settings.receiptFooter}</p>
            </div>
        </div>
    `;
}

// --- 5. Fungsi Inisialisasi Utama (`init()`) ---
async function init() {
    console.log("App init started.");
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (reportStartDate) reportStartDate.valueAsDate = firstDay;
    if (reportEndDate) reportEndDate.valueAsDate = lastDay;

    loadSettings(); // Ini sekarang sudah terdefinisi karena dipindahkan ke atas

    if (isOnline) {
        await syncData();
    } else {
        products = [];
        transactions = [];
        pendingTransactions = [];
        purchases = []; // NEW: Kosongkan pembelian juga
        alert("Aplikasi berada dalam mode offline. Tidak dapat memuat data dari Firebase.");
        updateSyncStatus(); // Set status ke offline
    }

    resetCurrentTransaction();
    resetCurrentPurchase(); // NEW: Reset pembelian juga
    loadHistory(historySearchInput ? historySearchInput.value : '');
    loadPurchaseHistory(purchaseHistorySearchInput ? purchaseHistorySearchInput.value : ''); // NEW: Muat riwayat pembelian
    loadDashboard(); // Panggil ini setelah semua data dimuat

    const sidebarToggle = document.getElementById('sidebarToggle');
    const wrapper = document.getElementById('wrapper');
    const sidebarNav = document.getElementById('sidebar-nav');

    if (sidebarToggle && wrapper && sidebarNav) {
        console.log("Initializing sidebar toggle listener.");
        sidebarToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            wrapper.classList.toggle('toggled');
            console.log("Sidebar toggled. Current state:", wrapper.classList.contains('toggled') ? 'open' : 'closed');
        });

        wrapper.addEventListener('click', (event) => {
            const sidebar = document.querySelector('.sidebar');
            if (window.innerWidth <= 768 && wrapper.classList.contains('toggled') && sidebar && !sidebar.contains(event.target) && event.target !== sidebarToggle) {
                wrapper.classList.remove('toggled');
                console.log("Clicked outside, sidebar closed.");
            }
        });

        sidebarNav.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    setTimeout(() => {
                        wrapper.classList.remove('toggled');
                        console.log("Nav link clicked, sidebar closed on mobile.");
                    }, 150);
                }
            });
        });
    } else {
        console.error("ERROR: One or more sidebar elements not found for toggle setup!", { sidebarToggle, wrapper, sidebarNav });
    }

    if (historySearchInput) {
        historySearchInput.addEventListener('input', (e) => {
            loadHistory(e.target.value.trim());
        });
    }

    // >>> NEW: Event listener untuk pencarian riwayat pembelian
    if (purchaseHistorySearchInput) {
        purchaseHistorySearchInput.addEventListener('input', (e) => {
            loadPurchaseHistory(e.target.value.trim());
        });
    }

    // >>> NEW: Event listener untuk pencarian produk di pembelian
    if (purchaseSearchProductInput) {
        purchaseSearchProductInput.addEventListener('input', (e) => {
            loadPurchaseProducts(e.target.value.trim());
        });
    }

    if (savePendingBtn) {
        savePendingBtn.addEventListener('click', async () => {
            if (currentTransaction.items.length === 0) {
                alert('Tidak ada item dalam transaksi!');
                return;
            }
            if (!isOnline) {
                alert('Anda sedang offline. Tidak dapat menyimpan transaksi pending ke Firebase.');
                return;
            }
            const pendingCustomerName = prompt("Masukkan nama pelanggan untuk transaksi pending (opsional):");
            if (pendingCustomerName !== null) {
                currentTransaction.customerName = pendingCustomerName.trim();
            } else {
                currentTransaction.customerName = '';
            }
            currentTransaction.date = new Date().toISOString();
            const success = await savePendingTransactionToFirestore(currentTransaction);
            if (success) {
                resetCurrentTransaction();
                alert('Transaksi berhasil disimpan sebagai pending!');
            } else {
                alert('Gagal menyimpan transaksi sebagai pending.');
            }
        });
    }

    if (processPaymentBtn) {
        processPaymentBtn.addEventListener('click', () => {
            if (currentTransaction.items.length === 0) {
                alert('Tidak ada item dalam transaksi!');
                return;
            }
            if (!isOnline) {
                alert('Anda sedang offline. Tidak dapat memproses pembayaran (menyimpan transaksi) ke Firebase.');
                return;
            }
            if (paymentModalTotal) paymentModalTotal.textContent = formatCurrency(currentTransaction.total);
            if (amountPaidElement) amountPaidElement.value = formatNumberForInput(currentTransaction.total);
            if (customerNameElement) customerNameElement.value = currentTransaction.customerName;
            calculateChange();
            if (paymentModal) paymentModal.show();
        });
    }

    if (completePaymentBtn) {
        completePaymentBtn.addEventListener('click', async () => {
            if (currentTransaction.items.length === 0) {
                alert('Tidak ada item dalam transaksi!');
                return;
            }
            if (!isOnline) {
                alert('Anda sedang offline. Tidak dapat menyelesaikan pembayaran (menyimpan transaksi) ke Firebase.');
                return;
            }
            const amountPaid = parseFloat(amountPaidElement.value.replace(/[^0-9.]/g,"")) || 0;
            if (amountPaid < currentTransaction.total) {
                alert('Jumlah pembayaran kurang!');
                return;
            }

            let allStockUpdatesSuccessful = true;
            const stockUpdatePromises = currentTransaction.items.map(async (item) => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const newStock = product.stock - item.kuantitas;
                    const success = await saveProductToFirestore({ stock: newStock }, product.id);
                    if (!success) {
                        allStockUpdatesSuccessful = false;
                    }
                    return success;
                }
                return true;
            });
            await Promise.all(stockUpdatePromises);

            if (!allStockUpdatesSuccessful) {
                alert("Gagal memperbarui stok salah satu produk. Transaksi tidak dapat diselesaikan.");
                return;
            }

            currentTransaction.date = new Date().toISOString();
            const transactionSuccess = await saveTransactionToFirestore(currentTransaction);
            if (!transactionSuccess) {
                return;
            }

            if (paymentModal) paymentModal.hide();
            if (receiptContent && receiptModal) {
                receiptContent.innerHTML = generateReceipt(currentTransaction);
                receiptModal.show();
            }

            resetCurrentTransaction();

            await syncData();
            loadDashboard();
            populateProductFilterDropdown();
        });
    }

    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!isOnline) {
                alert('Anda sedang offline. Tidak dapat menyimpan produk ke Firebase.');
                return;
            }
            const name = productNameInput ? productNameInput.value.trim() : '';
            const buyPrice = parseFloat(productBuyPriceInput ? productBuyPriceInput.value : 0);
            const sellPrice = parseFloat(productSellPriceInput ? productSellPriceInput.value.replace(/[^0-9.]/g,"") : 0);
            const stock = parseInt(productStockInput ? productStockInput.value : 0);
            const imageFile = productImageUpload ? productImageUpload.files[0] : null;

            let imageUrl = null;

            if (!name || isNaN(buyPrice) || isNaN(sellPrice) || isNaN(stock)) {
                alert('Harap isi semua field dengan benar!');
                return;
            }
            if (buyPrice <= 0 || sellPrice <= 0 || stock < 0) {
                alert('Harga dan stok harus valid!');
                return;
            }
            if (sellPrice < buyPrice) {
                alert('Harga jual tidak boleh lebih kecil dari harga beli!');
                return;
            }

            if (imageFile) {
                if (CLOUDINARY_CLOUD_NAME === 'ganti_dengan_cloud_name_anda' || CLOUDINARY_UPLOAD_PRESET === 'ganti_dengan_upload_preset_anda') {
                    alert('Cloudinary belum dikonfigurasi. Gambar tidak dapat diunggah. Silakan perbarui variabel CLOUDINARY_CLOUD_NAME dan CLOUDINARY_UPLOAD_PRESET di kode.');
                } else {
                    try {
                        if (saveProductBtn) {
                            saveProductBtn.textContent = 'Mengunggah Gambar...';
                            saveProductBtn.disabled = true;
                        }
                        imageUrl = await uploadImageToCloudinary(imageFile);
                        if (!imageUrl) {
                            alert('Gagal mengunggah gambar ke Cloudinary.');
                            if (saveProductBtn) {
                                saveProductBtn.textContent = 'Simpan Produk';
                                saveProductBtn.disabled = false;
                            }
                            return;
                        }
                    } catch (error) {
                        console.error('Error uploading image:', error);
                        alert('Terjadi kesalahan saat mengunggah gambar. Coba lagi: ' + error.message);
                        if (saveProductBtn) {
                            saveProductBtn.textContent = 'Simpan Produk';
                            saveProductBtn.disabled = false;
                        }
                        return;
                    }
                }
            } else if (editingProductId) {
                const existingProduct = products.find(p => p.id === editingProductId);
                if (existingProduct) {
                    imageUrl = existingProduct.image;
                }
            }
            const productData = {
                name,
                buyPrice,
                sellPrice,
                stock,
                image: imageUrl
            };

            const success = await saveProductToFirestore(productData, editingProductId);
            if (success) {
                alert(editingProductId ? 'Produk berhasil diperbarui!' : 'Produk berhasil ditambahkan!');
                editingProductId = null;
                if (productForm) productForm.reset();
                if (saveProductBtn) {
                    saveProductBtn.textContent = 'Simpan Produk';
                    saveProductBtn.classList.remove('btn-warning');
                    saveProductBtn.classList.add('btn-primary');
                }
                if (cancelEditBtn) cancelEditBtn.style.display = 'none';
                if (productImagePreview) productImagePreview.src = '';
                if (productImagePreviewContainer) productImagePreviewContainer.style.display = 'none';
            } else {
                if (saveProductBtn) {
                    saveProductBtn.textContent = 'Simpan Produk';
                    saveProductBtn.disabled = false;
                }
            }
        });
    }

    if (productImageUpload) {
        productImageUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (productImagePreview) productImagePreview.src = e.target.result;
                    if (productImagePreviewContainer) productImagePreviewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                if (productImagePreview) productImagePreview.src = '';
                if (productImagePreviewContainer) productImagePreviewContainer.style.display = 'none';
            }
        });
    }

    if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEditBtnClickHandler);

    // >>> NEW: Event listener untuk simpan pembelian
    if (savePurchaseBtn) savePurchaseBtn.addEventListener('click', processNewPurchase);

    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', () => {
            const startDate = reportStartDate ? reportStartDate.value : '';
            const endDate = reportEndDate ? reportEndDate.value : '';
            const selectedProductId = reportProductFilter ? reportProductFilter.value : 'all';

            if (!startDate || !endDate) {
                alert('Harap pilih tanggal mulai dan tanggal akhir!');
                return;
            }
            if (new Date(startDate) > new Date(endDate)) {
                alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir!');
                return;
            }

            let filteredTransactions = transactions.filter(t => {
                if (!t || !t.date) return false;
                const transactionDate = new Date(t.date).toISOString().split('T')[0];
                return transactionDate >= startDate && transactionDate <= endDate;
            });
            if (selectedProductId !== 'all') {
                filteredTransactions = filteredTransactions.map(transaction => {
                    const filteredItems = transaction.items.filter(item => item.productId === selectedProductId);
                    if (filteredItems.length === 0) return null;
                    const newTotal = filteredItems.reduce((sum, item) => sum + item.total, 0);
                    const newProfit = filteredItems.reduce((sum, item) => sum + ((item.hargaBarang - item.buyPrice) * item.kuantitas), 0);
                    return { ...transaction, items: filteredItems, total: newTotal, profit: newProfit };
                }).filter(t => t !== null);
            }
            const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
            const totalPurchases = filteredTransactions.reduce((sum, t) => {
                return sum + t.items.reduce((itemSum, i) => itemSum + (i.buyPrice * i.kuantitas), 0);
            }, 0);
            const grossProfit = totalSales - totalPurchases;

            if (reportTotalSales) reportTotalSales.textContent = formatCurrency(totalSales);
            if (reportTotalPurchases) reportTotalPurchases.textContent = formatCurrency(totalPurchases);
            if (reportGrossProfit) reportGrossProfit.textContent = formatCurrency(grossProfit);

            if (reportTransactions) reportTransactions.innerHTML = '';
            if (filteredTransactions.length === 0) {
                if (reportTransactions) reportTransactions.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada transaksi</td></tr>';
            } else {
                filteredTransactions.forEach(transaction => {
                    const transactionProfit = transaction.total - transaction.items.reduce((sum, i) => sum + (i.buyPrice * i.kuantitas), 0);
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${transaction.date ? new Date(transaction.date).toLocaleDateString('id-ID') : 'N/A'}</td>
                        <td>#${transaction.id}</td>
                        <td>${formatCurrency(transaction.total)}</td>
                        <td>${formatCurrency(transactionProfit)}</td>
                    `;
                    if (reportTransactions) reportTransactions.appendChild(row);
                });
            }
            generateItemProfitReport(filteredTransactions, selectedProductId);
            generateStockReport(selectedProductId);
        });
    }

    if (downloadReportPdfBtn) {
        downloadReportPdfBtn.addEventListener('click', function () {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const activeTab = document.querySelector('#reportTabs .nav-link.active')?.id;

            doc.setFontSize(16);
            doc.text("Laporan Rugi Laba", 14, 20);
            doc.setFontSize(10);

            const startDate = (reportStartDate ? reportStartDate.value : '') || '-';
            const endDate = (reportEndDate ? reportEndDate.value : '') || '-';
            doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28);

            if (activeTab === 'summary-tab') {
                const totalSales = (reportTotalSales ? reportTotalSales.innerText : '') || '';
                const totalPurchases = (reportTotalPurchases ? reportTotalPurchases.innerText : '') || '';
                const grossProfit = (reportGrossProfit ? reportGrossProfit.innerText : '') || '';

                doc.text(`Total Penjualan: ${totalSales}`, 14, 38);
                doc.text(`Total Pembelian (HPP): ${totalPurchases}`, 14, 44);
                doc.text(`Laba Kotor: ${grossProfit}`, 14, 50);

                doc.autoTable({
                    html: '#report-transactions',
                    startY: 60,
                    theme: 'grid',
                    headStyles: { fillColor: [0, 123, 255] },
                });
            } else if (activeTab === 'item-profit-tab') {
                doc.autoTable({
                    html: '#report-item-profit-table',
                    startY: 38,
                    theme: 'grid',
                    headStyles: { fillColor: [40, 167, 69] },
                });
            } else if (activeTab === 'stock-report-tab') {
                doc.autoTable({
                    html: '#report-stock-table',
                    startY: 38,
                    theme: 'grid',
                    headStyles: { fillColor: [255, 193, 7] },
                });
            } else {
                doc.text('Silakan pilih tab laporan yang ingin dicetak.', 14, 38);
            }

            doc.save("laporan-rugi-laba.pdf");
        });
    }

    // >>> PERUBAHAN: Hapus logika backup/restore
    /*
    backupBtn.addEventListener('click', () => { ... });
    restoreBtn.addEventListener('click', () => { ... });
    */

    if (printReceiptBtn) {
        printReceiptBtn.addEventListener('click', () => {
            const modalFooter = document.querySelector('#receiptModal .modal-footer');
            if (modalFooter) modalFooter.classList.add('d-none');

            const receiptElement = document.getElementById('printable-receipt');
            if (receiptElement && settings.printerPaperSize === '58mm') {
                receiptElement.style.maxWidth = '220px';
            } else if (receiptElement && settings.printerPaperSize === '80mm') {
                receiptElement.style.maxWidth = '300px';
            } else if (receiptElement) {
                receiptElement.style.maxWidth = '';
            }

            window.print();

            if (modalFooter) modalFooter.classList.remove('d-none');
            if (receiptElement) receiptElement.style.maxWidth = '300px';
        });
    }

    if (shareReceiptImageBtn) {
        shareReceiptImageBtn.addEventListener('click', () => {
            const receiptElement = document.getElementById('printable-receipt');
            if (!receiptElement) {
                alert('Struk tidak ditemukan.');
                return;
            }

            const modalFooter = document.querySelector('#receiptModal .modal-footer');
            if (modalFooter) modalFooter.classList.add('d-none');

            html2canvas(receiptElement, { scale: 2 }).then(canvas => {
                if (modalFooter) modalFooter.classList.remove('d-none');

                canvas.toBlob(async (blob) => {
                    if (navigator.share) {
                        try {
                            const file = new File([blob], `struk_pembayaran_${currentTransaction.id}.png`, { type: 'image/png' });
                            await navigator.share({
                                files: [file],
                                title: 'Struk Pembayaran POS',
                                text: 'Berikut struk pembayaran dari toko kami.'
                            });
                            console.log('Struk berhasil dibagikan');
                        } catch (error) {
                            console.error('Kesalahan berbagi:', error);
                            alert('Gagal berbagi struk. Fitur ini mungkin tidak didukung di perangkat atau browser Anda. Silakan download secara manual.');
                            const imageDataUrl = canvas.toDataURL('image/png');
                            const downloadLink = document.createElement('a');
                            downloadLink.href = imageDataUrl;
                            downloadLink.download = `struk_pembayaran_${currentTransaction.id}.png`;
                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                            document.body.removeChild(downloadLink);
                        }
                    } else {
                        alert('Fitur berbagi tidak didukung di browser ini. Silakan download gambar struk dan bagikan secara manual.');
                        const imageDataUrl = canvas.toDataURL('image/png');
                        const downloadLink = document.createElement('a');
                        downloadLink.href = imageDataUrl;
                        downloadLink.download = `struk_pembayaran_${currentTransaction.id}.png`;
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                    }
                }, 'image/png');
            }).catch(error => {
                console.error('Kesalahan menghasilkan gambar struk:', error);
                alert('Gagal membuat gambar struk. Silakan coba lagi.');
                if (modalFooter) modalFooter.classList.remove('d-none');
            });
        });
    }

    // >>> NEW: Print dan Share Nota Pembelian
    if (printPurchaseReceiptBtn) {
        printPurchaseReceiptBtn.addEventListener('click', () => {
            const modalFooter = document.querySelector('#purchaseReceiptModal .modal-footer');
            if (modalFooter) modalFooter.classList.add('d-none');

            const receiptElement = document.getElementById('printable-purchase-receipt');
            if (receiptElement && settings.printerPaperSize === '58mm') {
                receiptElement.style.maxWidth = '220px';
            } else if (receiptElement && settings.printerPaperSize === '80mm') {
                receiptElement.style.maxWidth = '300px';
            } else if (receiptElement) {
                receiptElement.style.maxWidth = '';
            }

            window.print();

            if (modalFooter) modalFooter.classList.remove('d-none');
            if (receiptElement) receiptElement.style.maxWidth = '300px';
        });
    }

    if (sharePurchaseReceiptImageBtn) {
        sharePurchaseReceiptImageBtn.addEventListener('click', () => {
            const receiptElement = document.getElementById('printable-purchase-receipt');
            if (!receiptElement) {
                alert('Nota tidak ditemukan.');
                return;
            }

            const modalFooter = document.querySelector('#purchaseReceiptModal .modal-footer');
            if (modalFooter) modalFooter.classList.add('d-none');

            html2canvas(receiptElement, { scale: 2 }).then(canvas => {
                if (modalFooter) modalFooter.classList.remove('d-none');

                canvas.toBlob(async (blob) => {
                    if (navigator.share) {
                        try {
                            const purchaseTxId = currentPurchase.id;
                            const file = new File([blob], `nota_pembelian_${purchaseTxId}.png`, { type: 'image/png' });
                            await navigator.share({
                                files: [file],
                                title: 'Nota Pembelian POS',
                                text: 'Berikut nota pembelian dari toko kami.'
                            });
                            console.log('Nota berhasil dibagikan');
                        } catch (error) {
                            console.error('Kesalahan berbagi:', error);
                            alert('Gagal berbagi nota. Fitur ini mungkin tidak didukung di perangkat atau browser Anda. Silakan download secara manual.');
                            const imageDataUrl = canvas.toDataURL('image/png');
                            const downloadLink = document.createElement('a');
                            downloadLink.href = imageDataUrl;
                            downloadLink.download = `nota_pembelian_${currentPurchase.id}.png`;
                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                            document.body.removeChild(downloadLink);
                        }
                    } else {
                        alert('Fitur berbagi tidak didukung di browser ini. Silakan download gambar nota dan bagikan secara manual.');
                        const imageDataUrl = canvas.toDataURL('image/png');
                        const downloadLink = document.createElement('a');
                        downloadLink.href = imageDataUrl;
                        downloadLink.download = `nota_pembelian_${currentPurchase.id}.png`;
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                    }
                }, 'image/png');
            }).catch(error => {
                console.error('Kesalahan menghasilkan gambar nota:', error);
                alert('Gagal membuat gambar nota. Silakan coba lagi.');
                if (modalFooter) modalFooter.classList.remove('d-none');
            });
        });
    }


    if (storeSettingsForm) {
        storeSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            settings.storeName = storeNameInput ? storeNameInput.value.trim() : '';
            settings.storeAddress = storeAddressInput ? storeAddressInput.value.trim() : '';
            settings.storePhone = storePhoneInput ? storePhoneInput.value.trim() : '';
            settings.receiptFooter = receiptFooterInput ? receiptFooterInput.value.trim() : '';
            localStorage.setItem('pos_settings', JSON.stringify(settings));
            alert('Pengaturan toko berhasil disimpan!');
            if (receiptModal && receiptModal._isShown) {
                receiptContent.innerHTML = generateReceipt(currentTransaction);
            }
        });
    }

    if (savePrinterSettingsBtn) {
        savePrinterSettingsBtn.addEventListener('click', () => {
            settings.printerPaperSize = printerPaperSizeSelect ? printerPaperSizeSelect.value : '80mm';
            settings.printPreview = printPreviewSelect ? printPreviewSelect.value : 'yes';
            localStorage.setItem('pos_settings', JSON.stringify(settings));
            alert('Pengaturan printer berhasil disimpan!');
        });
    }

    if (saveOtherSettingsBtn) {
        saveOtherSettingsBtn.addEventListener('click', async () => {
            settings.currencySymbol = currencySymbolInput ? currencySymbolInput.value.trim() : 'Rp ';
            localStorage.setItem('pos_settings', JSON.stringify(settings));
            alert('Pengaturan lainnya berhasil disimpan!');
            await syncData(); 
            updateTransactionDisplay();
        });
    }

    if (amountPaidElement) {
        amountPaidElement.addEventListener('input', () => {
            const cleanValue = amountPaidElement.value.replace(/[^0-9.]/g,"");
            amountPaidElement.value = cleanValue;
            calculateChange();
        });
    }

    if (paymentMethodElement) {
        paymentMethodElement.addEventListener('change', () => {
            currentTransaction.paymentMethod = paymentMethodElement.value;
        });
    }
    if (customerNameElement) {
        customerNameElement.addEventListener('input', () => {
            currentTransaction.customerName = customerNameElement.value;
        });
    }

    if (pendingCustomerNameInput) {
        pendingCustomerNameInput.addEventListener('input', () => {
        });
    }

    if (productSearchElement) {
        productSearchElement.addEventListener('input', (e) => {
            loadProducts(e.target.value, currentProductView);
        });
    }
    if (productListSearch) {
        productListSearch.addEventListener('input', (e) => {
            loadProducts(e.target.value, currentProductView);
        });
    }

    if (viewListBtn) {
        viewListBtn.addEventListener('click', () => {
            viewListBtn.classList.add('active');
            if (viewGridBtn) viewGridBtn.classList.remove('active');
            loadProducts(productSearchElement ? productSearchElement.value : '', 'list');
        });
    }

    if (viewGridBtn) {
        viewGridBtn.addEventListener('click', () => {
            viewGridBtn.classList.add('active');
            if (viewListBtn) viewListBtn.classList.remove('active');
            loadProducts(productSearchElement ? productSearchElement.value : '', 'grid');
        });
    }

    if (quickSalesBtn) {
        quickSalesBtn.addEventListener('click', () => {
            const salesTabElement = document.getElementById('nav-sales-tab');
            if (salesTabElement) {
                const bsTab = new bootstrap.Tab(salesTabElement);
                bsTab.show();
            }
        });
    }

    if (quickAddProductBtn) {
        quickAddProductBtn.addEventListener('click', () => {
            const stockTabElement = document.getElementById('nav-stock-tab');
            if (stockTabElement) {
                const bsTab = new bootstrap.Tab(stockTabElement);
                bsTab.show();
            }
        });
    }

    // >>> NEW: Quick Add Purchase Button
    if (quickAddPurchaseBtn) {
        quickAddPurchaseBtn.addEventListener('click', () => {
            const purchaseTabElement = document.getElementById('nav-purchase-tab');
            if (purchaseTabElement) {
                const bsTab = new bootstrap.Tab(purchaseTabElement);
                bsTab.show();
            }
        });
    }

    console.log("App init finished.");
} // END of init() function

// --- 6. Pemanggilan init() saat DOM siap ---
document.addEventListener('DOMContentLoaded', init);
// >>> PERUBAHAN: Service Worker dinonaktifkan untuk mode Online-Only
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => { console.log('Service Worker registered! Scope:', reg.scope); })
            .catch(err => { console.log('Service Worker registration failed:', err); });
    });
}
*/