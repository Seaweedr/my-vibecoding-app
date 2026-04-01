import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useStorage } from '../context/StorageContext';
import type { ExpenseCategory, CurrencyCode, ExpenseItem, SplitMode, ExpenseSplit } from '../types';
import { ArrowLeft, Check, Coffee, Bus, Bed, ShoppingBag, Music, MoreHorizontal, Plus, X, Clock, Camera, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, isValid } from 'date-fns';
import { compressImage } from '../lib/imageUtils';
import { scanReceipt } from '../lib/ocr';
import { saveImageToDB, getImageFromDB } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

const CATEGORIES: { id: ExpenseCategory; label: string; icon: any }[] = [
    { id: 'food', label: '餐飲', icon: Coffee },
    { id: 'transport', label: '交通', icon: Bus },
    { id: 'accommodation', label: '住宿', icon: Bed },
    { id: 'shopping', label: '購物', icon: ShoppingBag },
    { id: 'entertainment', label: '娛樂', icon: Music },
    { id: 'other', label: '其他', icon: MoreHorizontal },
];

export function AddExpensePage() {
    const { tripId } = useParams<{ tripId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { trips, addExpense, updateExpense, expenses } = useStorage();

    const trip = trips.find(t => t.id === tripId);

    // Edit Mode Check
    const expenseId = searchParams.get('expenseId');
    const existingExpense = expenseId ? expenses.find(e => e.id === expenseId) : null;
    const isEditMode = !!existingExpense;

    // Check for passed state image (ID preferred, or raw base64 fallback)
    const passedImageId = location.state && (location.state as any).scannedImageId;
    const passedRawImage = location.state && (location.state as any).scannedImage;
    const passedScanResult = location.state && (location.state as any).scanResult;
    const passedReceiptImage = location.state && (location.state as any).receiptImage;

    const mode = searchParams.get('mode') || 'manual';

    // State Initialization
    const [amount, setAmount] = useState(existingExpense ? String(existingExpense.amount) : '');
    const [merchant, setMerchant] = useState(existingExpense ? existingExpense.merchant : '');
    const [category, setCategory] = useState<ExpenseCategory>(existingExpense ? existingExpense.category : 'food');

    // FIX: Ensure valid date initialization
    const getInitialDate = () => {
        try {
            if (existingExpense) {
                return format(new Date(existingExpense.date), "yyyy-MM-dd'T'HH:mm");
            }
            return format(new Date(), "yyyy-MM-dd'T'HH:mm");
        } catch (e) {
            console.error("Date init error", e);
            return format(new Date(), "yyyy-MM-dd'T'HH:mm");
        }
    };

    const [date, setDate] = useState(getInitialDate());
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(existingExpense ? existingExpense.currency : (trip?.currency || 'TWD'));

    // imageIds holds the keys for DB (or rarely base64 for legacy support if needed, but we try to migrate)
    const [imageIds, setImageIds] = useState<string[]>(existingExpense ? (existingExpense.images || []) : []);
    // displayImages holds the actual base64/blob for UI rendering
    const [displayImages, setDisplayImages] = useState<string[]>([]);

    const [items, setItems] = useState<ExpenseItem[]>(existingExpense?.items || []);

    const [isScanning, setIsScanning] = useState(false); // UI state for OCR loading
    const [ocrProcessed, setOcrProcessed] = useState(false); // Track if OCR has been processed

    const dateInputRef = useRef<HTMLInputElement>(null);
    const companions = useStorage().getTripCompanions(trip?.id || '');
    const [involvedCompanionIds, setInvolvedCompanionIds] = useState<string[]>(
        existingExpense && existingExpense.splits.length > 0
            ? existingExpense.splits.map(s => s.companionId)
            : ['user', ...companions.map(c => c.id)] // Default involvement including all
    );
    const [paidBy, setPaidBy] = useState<string>(existingExpense?.paidBy || 'user');
    const [splitMode, setSplitMode] = useState<SplitMode>(existingExpense?.splitMode || 'equal');
    const [splitValues, setSplitValues] = useState<Record<string, number>>(() => {
        if (existingExpense && existingExpense.splits.length > 0) {
            const vals: Record<string, number> = {};
            existingExpense.splits.forEach(s => {
                // If percentage, we might want to recover it, but for now store amount
                vals[s.companionId] = s.amount;
            });
            return vals;
        }
        return {};
    });

    const [showSplit, setShowSplit] = useState(false);
    const [showPayer, setShowPayer] = useState(false);
    const [note, setNote] = useState(existingExpense ? existingExpense.note || '' : '');

    // Load display images from DB whenever imageIds change
    useEffect(() => {
        const loadImages = async () => {
            const loaded: string[] = [];
            for (const id of imageIds) {
                // Check if it's already a base64 string (legacy or temp)
                if (id.startsWith('data:')) {
                    loaded.push(id);
                } else {
                    // Try fetch from DB
                    const fromDB = await getImageFromDB(id);
                    if (fromDB) loaded.push(fromDB);
                }
            }
            setDisplayImages(loaded);
        };
        loadImages();
    }, [imageIds]);

    // Handle initial passed image and OCR result
    useEffect(() => {
        const initPassedData = async () => {
            if (!isEditMode && !ocrProcessed) {
                // Handle passed OCR result first
                if (passedScanResult) {
                    console.log('Using passed OCR result:', passedScanResult);

                    if (passedScanResult.total) {
                        setAmount(passedScanResult.total.toString());
                    }
                    if (passedScanResult.merchant) {
                        setMerchant(passedScanResult.merchant);
                    }
                    if (passedScanResult.currency) {
                        setSelectedCurrency(passedScanResult.currency as CurrencyCode);
                    }
                    if (passedScanResult.date) {
                        // OCR returns YYYY-MM-DD
                        const parsedDate = new Date(passedScanResult.date);
                        if (isValid(parsedDate)) {
                            // Keep current time if possible or just use start of day
                            const now = new Date();
                            parsedDate.setHours(now.getHours(), now.getMinutes());
                            setDate(format(parsedDate, "yyyy-MM-dd'T'HH:mm"));
                        }
                    }
                    if (passedScanResult.items && passedScanResult.items.length > 0) {
                        const newItems = passedScanResult.items.map((i: any) => ({
                            id: uuidv4(),
                            name: i.name,
                            amount: i.amount
                        }));
                        setItems(newItems);
                    }
                    setOcrProcessed(true);
                }

                // Handle passed receipt image
                if (passedReceiptImage && imageIds.length === 0) {
                    try {
                        const id = await saveImageToDB(passedReceiptImage);
                        setImageIds([id]);
                    } catch (e) {
                        console.error("Failed to save receipt image", e);
                    }
                } else if (passedImageId && imageIds.length === 0) {
                    // Clean ID passed from BottomNav
                    setImageIds([passedImageId]);
                } else if (passedRawImage && imageIds.length === 0) {
                    // Legacy/Fallback: Raw base64 passed
                    try {
                        const id = await saveImageToDB(passedRawImage);
                        setImageIds([id]);
                    } catch (e) {
                        console.error("Failed to init raw image", e);
                    }
                }
            }
        };
        initPassedData();
    }, [passedImageId, passedRawImage, passedScanResult, passedReceiptImage, isEditMode, ocrProcessed]);

    // OCR Logic - Only run if no passed scan result
    useEffect(() => {
        const performOCR = async () => {
            // Only scan if: in scan mode, not editing existing, we have images, not already scanning, no items yet, and no passed result
            if (mode === 'scan' && !isEditMode && displayImages.length > 0 && !isScanning && items.length === 0 && amount === '' && !ocrProcessed && !passedScanResult) {
                setIsScanning(true);
                try {
                    // Use the first image for OCR
                    const targetImage = displayImages[0];
                    const result = await scanReceipt(targetImage);

                    if (result.total) {
                        setAmount(result.total.toString());
                    }
                    if (result.merchant) {
                        setMerchant(result.merchant);
                    }
                    if (result.currency) {
                        setSelectedCurrency(result.currency as CurrencyCode);
                    }
                    if (result.date) {
                        const parsedDate = new Date(result.date);
                        if (isValid(parsedDate)) {
                            const now = new Date();
                            parsedDate.setHours(now.getHours(), now.getMinutes());
                            setDate(format(parsedDate, "yyyy-MM-dd'T'HH:mm"));
                        }
                    }
                    if (result.items.length > 0) {
                        const newItems = result.items.map(i => ({
                            id: uuidv4(),
                            name: i.name,
                            amount: i.amount
                        }));
                        setItems(newItems);
                    }
                    setOcrProcessed(true);
                } catch (err) {
                    console.error("OCR Error", err);
                } finally {
                    setIsScanning(false);
                }
            }
        };

        // Trigger OCR only when we have the image loaded and in scan mode
        performOCR();
    }, [mode, isEditMode, displayImages, ocrProcessed, passedScanResult]);

    // Auto-sum effect for items
    useEffect(() => {
        if (items.length > 0) {
            const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            setAmount(total.toString());
        }
    }, [items]);

    const handleAddItem = () => {
        const newItem: ExpenseItem = {
            id: uuidv4(),
            name: '',
            amount: 0
        };
        setItems([...items, newItem]);
    };

    const handleUpdateItem = (id: string, field: keyof ExpenseItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const toggleCompanion = (id: string) => {
        setInvolvedCompanionIds(prev => {
            if (prev.includes(id)) {
                if (prev.length === 1) return prev;
                return prev.filter(c => c !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        const compressed = await compressImage(reader.result as string);
                        // Save to DB immediately
                        const id = await saveImageToDB(compressed);
                        setImageIds(prev => [...prev, id]);
                    } catch (err) {
                        console.error("Image upload failed", err);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trip) return;

        // Safety scan: Ensure no raw base64 images are saved to localStorage
        const sanitizedImageIds: string[] = [];
        for (const id of imageIds) {
            if (id.startsWith('data:')) {
                try {
                    const newId = await saveImageToDB(id);
                    sanitizedImageIds.push(newId);
                } catch (err) {
                    console.error("Failed to save image to DB during submit", err);
                }
            } else {
                sanitizedImageIds.push(id);
            }
        }

        const totalAmount = parseFloat(amount) || 0;
        let splits: ExpenseSplit[] = [];

        if (splitMode === 'equal') {
            const splitAmount = totalAmount / involvedCompanionIds.length;
            splits = involvedCompanionIds.map(id => ({
                companionId: id,
                amount: Number(splitAmount.toFixed(2))
            }));
        } else if (splitMode === 'exact') {
            splits = involvedCompanionIds.map(id => ({
                companionId: id,
                amount: splitValues[id] || 0
            }));
        } else if (splitMode === 'percentage') {
            splits = involvedCompanionIds.map(id => ({
                companionId: id,
                amount: Number(((splitValues[id] || 0) / 100 * totalAmount).toFixed(2))
            }));
        } else if (splitMode === 'shares') {
            const totalShares = involvedCompanionIds.reduce((sum, id) => sum + (splitValues[id] || 0), 0);
            splits = involvedCompanionIds.map(id => ({
                companionId: id,
                amount: totalShares > 0 ? Number(((splitValues[id] || 0) / totalShares * totalAmount).toFixed(2)) : 0
            }));
        }

        // Handle rounding difference by adding to first person
        const totalSplitAmount = splits.reduce((sum, s) => sum + s.amount, 0);
        if (totalSplitAmount !== totalAmount && splits.length > 0) {
            splits[0].amount += Number((totalAmount - totalSplitAmount).toFixed(2));
        }

        const expenseData = {
            amount: totalAmount,
            currency: selectedCurrency,
            date: new Date(date),
            merchant: merchant || '未分類商店',
            category,
            note: note,
            paidBy,
            splitMode,
            splits,
            images: sanitizedImageIds,
            items: items.length > 0 ? items : undefined,
        };

        if (isEditMode && existingExpense) {
            updateExpense(existingExpense.id, expenseData);
        } else {
            addExpense({
                tripId: trip.id,
                ...expenseData
            });
        }

        navigate(`/trips/${trip.id}`);
    };

    if (!trip) return <div>Trip not found</div>;

    const currencies: CurrencyCode[] = ['TWD', 'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'KRW'];

    // Amount increment/decrement handlers
    const handleAmountChange = (delta: number) => {
        const current = parseFloat(amount) || 0;
        setAmount(Math.max(0, current + delta).toString());
    };

    // Safe date display helper
    const getDateDisplay = (dateString: string) => {
        const d = new Date(dateString);
        if (!isValid(d)) return {
            date: 'Invalid Date',
            time: '--:--',
            day: '-'
        };
        return {
            date: format(d, 'yyyy年MM月dd日'),
            time: format(d, 'HH:mm'),
            day: format(d, 'EEEE')
        };
    };

    const dateDisplay = getDateDisplay(date);

    return (
        <div className="min-h-screen bg-gray-50 pb-safe">
            {/* Header - Fixed & Transparent/Clean */}
            <header className="fixed top-0 left-0 right-0 bg-gray-50 z-50 px-4 py-3 pb-2 transition-all">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-200/50 transition-colors text-text"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-lg font-bold text-text">
                        {isEditMode ? '編輯消費' : '新增消費'}
                    </h1>
                    <div className="w-10"></div> {/* Spacer for center alignment */}
                </div>
            </header>

            {/* Main Content */}
            <form onSubmit={handleSubmit} className="pt-20 px-6 space-y-6">

                {/* Amount Section with Custom Controls */}
                <div className="flex items-center justify-between gap-4">
                    {/* Currency Dropdown */}
                    <div className="relative shrink-0">
                        <select
                            value={selectedCurrency}
                            onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                            className="appearance-none bg-white border border-gray-200 rounded-2xl pl-4 pr-10 py-3 font-bold text-xl text-text cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-sm"
                        >
                            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                            <ChevronDown size={16} />
                        </div>
                    </div>

                    {/* Amount Input & Controls */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <input
                            type="number"
                            inputMode="decimal"
                            placeholder="0"
                            className="w-full text-right bg-transparent text-5xl font-black text-text placeholder:text-gray-200 outline-none p-0"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            autoFocus={!isEditMode}
                        />
                        {/* Custom Spinners */}
                        <div className="flex flex-col gap-1">
                            <button
                                type="button"
                                onClick={() => handleAmountChange(1)}
                                className="p-1 bg-white rounded-md shadow-sm border border-gray-100 text-text-secondary active:scale-90 active:bg-gray-50 transition-all"
                            >
                                <ChevronUp size={20} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAmountChange(-1)}
                                className="p-1 bg-white rounded-md shadow-sm border border-gray-100 text-text-secondary active:scale-90 active:bg-gray-50 transition-all"
                            >
                                <ChevronDown size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* OCR Status Banner */}
                {isScanning && (
                    <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex items-center justify-center gap-2 text-accent animate-pulse">
                        <Loader2 className="animate-spin" size={18} />
                        <span className="text-sm font-bold">正在掃描收據內容...</span>
                    </div>
                )}


                {/* Categories */}
                <div className="grid grid-cols-3 gap-3">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-xl transition-all border-2 active:scale-95 duration-200",
                                category === cat.id
                                    ? "bg-accent/10 border-accent text-accent"
                                    : "bg-white border-transparent text-text-secondary hover:bg-gray-50"
                            )}
                        >
                            <cat.icon size={24} className="mb-1" />
                            <span className="text-xs font-medium">{cat.label}</span>
                        </button>
                    ))}
                </div>

                {/* Photos Section */}
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    <label className="flex-shrink-0 w-20 h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200/50 hover:border-gray-400 transition-all active:scale-95">
                        <Camera size={24} />
                        <span className="text-[10px] font-medium mt-1">拍照</span>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </label>
                    <label className="flex-shrink-0 w-20 h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200/50 hover:border-gray-400 transition-all active:scale-95">
                        <Plus size={24} />
                        <span className="text-[10px] font-medium mt-1">相簿</span>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </label>
                    {/* Display actual base64 images */}
                    {displayImages.map((img, idx) => (
                        <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                            <img src={img} alt="receipt" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    // Remove ID based on index mismatch (simple way since they sync)
                                    // Better to filter both states
                                    setImageIds(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm text-white rounded-full p-1 hover:bg-red-500 transition-colors shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Details - Styled to feel like App UI */}
                <div className="bg-white rounded-[20px] p-4 space-y-4 border border-gray-200">
                    {/* Merchant Input - Clean line */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-text-secondary ml-1">商家</label>
                        <input
                            type="text"
                            placeholder="例如：7-Eleven"
                            className="w-full text-base font-medium p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-gray-300"
                            value={merchant}
                            onChange={e => setMerchant(e.target.value)}
                        />
                    </div>

                    {/* Items List (New Feature) */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-text-secondary ml-1">消費明細 (選填)</label>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="text-accent text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors"
                            >
                                <Plus size={14} />
                                新增商品
                            </button>
                        </div>

                        {items.length > 0 && (
                            <div className="space-y-2 p-2 bg-gray-50 rounded-xl">
                                {items.map((item, index) => (
                                    <div key={item.id} className="flex gap-2 items-center animate-fade-in">
                                        <input
                                            type="text"
                                            placeholder="商品名稱"
                                            className="flex-1 min-w-0 bg-white p-2 rounded-lg text-sm font-medium border border-gray-100 focus:border-accent/50 outline-none transition-all placeholder:text-gray-300"
                                            value={item.name}
                                            onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                            autoFocus={index === items.length - 1 && item.name === ''}
                                        />
                                        <input
                                            type="number"
                                            placeholder="0"
                                            className="w-20 bg-white p-2 rounded-lg text-sm font-medium text-right border border-gray-100 focus:border-accent/50 outline-none transition-all placeholder:text-gray-300"
                                            value={item.amount || ''}
                                            onChange={(e) => handleUpdateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex justify-between px-2 pt-1 text-xs text-text-secondary">
                                    <span>總計</span>
                                    <span className="font-bold">
                                        {new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 0 }).format(items.reduce((acc, i) => acc + (Number(i.amount) || 0), 0))}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Date Picker - Custom UI Trigger */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-text-secondary ml-1">日期與時間</label>
                        <div
                            className="date-input-wrapper bg-gray-50 rounded-xl p-3 relative group active:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => {
                                // Add safety check for showPicker
                                dateInputRef.current?.showPicker?.();
                            }}
                        >
                            {/* Visual Facade */}
                            <div className="flex items-center gap-3 w-full">
                                <div className="p-2 bg-white rounded-full text-primary shadow-sm">
                                    <Clock size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-text">
                                        {dateDisplay.date}
                                    </span>
                                    <span className="text-xs text-text-secondary font-medium">
                                        {dateDisplay.time} • {dateDisplay.day}
                                    </span>
                                </div>
                                <div className="ml-auto text-gray-300">
                                    <ArrowLeft size={16} className="-rotate-90" />
                                </div>
                            </div>

                            {/* Actual Input (Hidden but API accessible) */}
                            <input
                                ref={dateInputRef}
                                type="datetime-local"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 z-20 pointer-events-none"
                            />
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
                        <label className="text-xs font-bold text-text-secondary ml-1">備註</label>
                        <textarea
                            placeholder="寫點什麼... (例如：幫同事代購、這餐超好吃)"
                            className="w-full text-sm font-medium p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-gray-300 min-h-[80px] resize-none"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                        />
                    </div>

                    {/* Payer Section */}
                    <div className="pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setShowPayer(!showPayer)}
                            className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold text-text-secondary ml-1">付款人</span>
                                <span className="font-bold text-text ml-1 mt-1">
                                    {paidBy === 'user' ? '我' : (companions.find(c => c.id === paidBy)?.name || '未知')}
                                </span>
                            </div>
                            <div className={cn("text-primary transition-transform", showPayer && "rotate-180")}>
                                <ChevronDown size={20} />
                            </div>
                        </button>

                        {showPayer && (
                            <div className="mt-2 flex gap-2 flex-wrap p-2 bg-gray-50 rounded-xl animate-slide-down">
                                <button
                                    type="button"
                                    onClick={() => { setPaidBy('user'); setShowPayer(false); }}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                                        paidBy === 'user' ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-text-secondary border-gray-200"
                                    )}
                                >
                                    我
                                </button>
                                {companions.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => { setPaidBy(c.id); setShowPayer(false); }}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                                            paidBy === c.id ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-text-secondary border-gray-200"
                                        )}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Split Section */}
                    <div className="pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setShowSplit(!showSplit)}
                            className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold text-text-secondary ml-1">分攤對象與方式</span>
                                <span className="font-bold text-text ml-1 mt-1">
                                    {involvedCompanionIds.length} 人 • {
                                        splitMode === 'equal' ? '平均' :
                                            splitMode === 'exact' ? '精確金額' :
                                                splitMode === 'percentage' ? '百分比' : '股份'
                                    }
                                </span>
                            </div>
                            <div className={cn("text-primary transition-transform", showSplit && "rotate-180")}>
                                <ChevronDown size={20} />
                            </div>
                        </button>

                        {showSplit && (
                            <div className="mt-4 space-y-6 animate-slide-down bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                                {/* Involved People Toggle */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 ml-1">參與人員</label>
                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => toggleCompanion('user')}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                                                involvedCompanionIds.includes('user')
                                                    ? "bg-white text-accent border-accent shadow-sm"
                                                    : "bg-transparent text-text-secondary border-gray-200 opacity-60"
                                            )}
                                        >
                                            我
                                        </button>
                                        {companions.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => toggleCompanion(c.id)}
                                                className={cn(
                                                    "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                                                    involvedCompanionIds.includes(c.id)
                                                        ? "bg-white text-accent border-accent shadow-sm"
                                                        : "bg-transparent text-text-secondary border-gray-200 opacity-60"
                                                )}
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Mode Select */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 ml-1">分攤方式</label>
                                    <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl">
                                        {(['equal', 'exact', 'percentage', 'shares'] as SplitMode[]).map(mode => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setSplitMode(mode)}
                                                className={cn(
                                                    "py-2 rounded-lg text-[10px] font-bold transition-all",
                                                    splitMode === mode ? "bg-white text-accent shadow-sm" : "text-gray-400"
                                                )}
                                            >
                                                {mode === 'equal' ? '平均' : mode === 'exact' ? '金額' : mode === 'percentage' ? '%' : '份'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Value Inputs */}
                                <div className="space-y-3 pt-2">
                                    {involvedCompanionIds.map(id => (
                                        <div key={id} className="flex items-center justify-between gap-3 px-1">
                                            <span className="text-sm font-bold text-text truncate max-w-[100px]">
                                                {id === 'user' ? '我' : companions.find(pc => pc.id === id)?.name}
                                            </span>
                                            <div className="relative flex items-center flex-1">
                                                {splitMode !== 'equal' && (
                                                    <div className="flex items-center w-full">
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            className="w-full text-right bg-white p-2 rounded-xl text-sm font-bold text-accent border border-gray-200 outline-none focus:ring-2 focus:ring-accent/10 transition-all"
                                                            value={splitValues[id] || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                setSplitValues(prev => ({ ...prev, [id]: val }));
                                                            }}
                                                            onFocus={(e) => e.target.select()}
                                                        />
                                                        <span className="ml-2 text-xs font-black text-gray-300 w-6">
                                                            {splitMode === 'exact' ? selectedCurrency : splitMode === 'percentage' ? '%' : '份'}
                                                        </span>
                                                    </div>
                                                )}
                                                {splitMode === 'equal' && (
                                                    <div className="w-full text-right py-2 pr-8 text-sm font-bold text-accent/60 italic">
                                                        {new Intl.NumberFormat('en-US', { style: 'decimal' }).format(Number(amount) / involvedCompanionIds.length)} {selectedCurrency}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {splitMode === 'percentage' && (
                                    <div className="pt-2 px-1 flex justify-between items-center bg-gray-100/50 p-2 rounded-lg">
                                        <span className="text-[10px] font-bold text-gray-400">總計百分比</span>
                                        <span className={cn(
                                            "text-xs font-black",
                                            Math.abs(involvedCompanionIds.reduce((s, id) => s + (splitValues[id] || 0), 0) - 100) < 0.1 ? "text-green-500" : "text-red-500"
                                        )}>
                                            {involvedCompanionIds.reduce((s, id) => s + (splitValues[id] || 0), 0)}% / 100%
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full py-4 bg-primary text-white font-heading font-bold rounded-full shadow-deep active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                    <Check size={20} />
                    {isEditMode ? '儲存變更' : '儲存消費'}
                </button>
            </form>
        </div>
    );
}
