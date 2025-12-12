import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStorage } from '../context/StorageContext';
import type { ExpenseCategory, CurrencyCode } from '../types';
import { ArrowLeft, Check, Coffee, Bus, Bed, ShoppingBag, Music, MoreHorizontal, Plus, X, Clock, Camera, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

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
    const { trips, addExpense, updateExpense, expenses } = useStorage();

    const trip = trips.find(t => t.id === tripId);

    // Edit Mode Check
    const expenseId = searchParams.get('expenseId');
    const existingExpense = expenseId ? expenses.find(e => e.id === expenseId) : null;
    const isEditMode = !!existingExpense;

    const mode = searchParams.get('mode') || 'manual';

    // State Initialization
    const [amount, setAmount] = useState(existingExpense ? String(existingExpense.amount) : '');
    const [merchant, setMerchant] = useState(existingExpense ? existingExpense.merchant : '');
    const [category, setCategory] = useState<ExpenseCategory>(existingExpense ? existingExpense.category : 'food');
    const [date, setDate] = useState(existingExpense ? format(new Date(existingExpense.date), 'yyyy-MM-dd HH:mm') : format(new Date(), 'yyyy-MM-dd HH:mm'));
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(existingExpense ? existingExpense.currency : (trip?.currency || 'TWD'));

    // Split Logic
    const companions = useStorage().getTripCompanions(trip?.id || '');
    const [involvedCompanionIds, setInvolvedCompanionIds] = useState<string[]>(
        existingExpense && existingExpense.splits.length > 0
            ? existingExpense.splits.map(s => s.companionId)
            : ['user']
    );
    const [showSplit, setShowSplit] = useState(involvedCompanionIds.length > 1);

    const [images, setImages] = useState<string[]>(existingExpense ? (existingExpense.images || []) : []);

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
                reader.onloadend = () => {
                    setImages(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    // Simulate OCR pre-fill
    useEffect(() => {
        if (mode === 'scan' && !isEditMode) {
            // Simulate a delay then fill
            const timer = setTimeout(() => {
                setAmount('1250');
                setMerchant('Delicious Ramen');
                setCategory('food');
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [mode, isEditMode]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!trip) return;

        const totalAmount = parseFloat(amount);
        const splitCount = involvedCompanionIds.length;
        const splitAmount = totalAmount / splitCount;

        const splits = involvedCompanionIds.map(id => ({
            companionId: id,
            amount: splitAmount
        }));

        const expenseData = {
            amount: totalAmount,
            currency: selectedCurrency,
            date: new Date(date),
            merchant: merchant || 'Unknown Merchant',
            category,
            note: '',
            paidBy: 'user',
            splits,
            images,
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
                            className="appearance-none bg-white border border-gray-200 rounded-2xl pl-4 pr-10 py-3 font-bold text-xl text-text cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
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
                                    ? "bg-primary/10 border-primary text-primary"
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
                    {images.map((img, idx) => (
                        <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                            <img src={img} alt="receipt" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setImages(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm text-white rounded-full p-1 hover:bg-red-500 transition-colors shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Details - Styled to feel like App UI */}
                < div className="bg-white rounded-2xl p-4 space-y-4 shadow-sm border border-gray-100" >
                    {/* Merchant Input - Clean line */}
                    < div className="flex flex-col gap-1" >
                        <label className="text-xs font-bold text-text-secondary ml-1">商家</label>
                        <input
                            type="text"
                            placeholder="例如：7-Eleven"
                            className="w-full text-base font-medium p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-300"
                            value={merchant}
                            onChange={e => setMerchant(e.target.value)}
                        />
                    </div >

                    {/* Date Picker - Custom UI Trigger */}
                    < div className="flex flex-col gap-1" >
                        <label className="text-xs font-bold text-text-secondary ml-1">日期與時間</label>
                        <div className="date-input-wrapper bg-gray-50 rounded-xl p-3 relative group active:bg-gray-100 transition-colors">
                            {/* Visual Facade */}
                            <div className="flex items-center gap-3 w-full">
                                <div className="p-2 bg-white rounded-full text-primary shadow-sm">
                                    <Clock size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-text">
                                        {format(new Date(date), 'yyyy年MM月dd日')}
                                    </span>
                                    <span className="text-xs text-text-secondary font-medium">
                                        {format(new Date(date), 'HH:mm')} • {format(new Date(date), 'EEEE')}
                                    </span>
                                </div>
                                <div className="ml-auto text-gray-300">
                                    <ArrowLeft size={16} className="-rotate-90" />
                                </div>
                            </div>

                            {/* Actual Input (Hidden) */}
                            <input
                                type="datetime-local"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                    </div >

                    {/* Split Section */}
                    < div className="pt-2" >
                        <button
                            type="button"
                            onClick={() => setShowSplit(!showSplit)}
                            className="flex items-center justify-between w-full p-3 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                            <span className="font-heading font-medium text-text">分攤對象</span>
                            <span className="text-primary text-sm font-medium">{involvedCompanionIds.length > 0 ? `${involvedCompanionIds.length} 人` : '僅自己'}</span>
                        </button>

                        {
                            showSplit && (
                                <div className="mt-3 space-y-3 animate-slide-down">
                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => toggleCompanion('user')}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                                                involvedCompanionIds.includes('user')
                                                    ? "bg-primary text-white border-primary"
                                                    : "bg-gray-50 text-text-secondary border-transparent"
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
                                                    "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                                                    involvedCompanionIds.includes(c.id)
                                                        ? "bg-primary text-white border-primary"
                                                        : "bg-gray-50 text-text-secondary border-transparent"
                                                )}
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-text-secondary">
                                        目前為平均分攤。每人應付 <span className="font-bold">{
                                            amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedCurrency }).format(Number(amount) / (involvedCompanionIds.length || 1)) : '-'
                                        }</span>
                                    </p>
                                </div>
                            )
                        }
                    </div >
                </div >

                <button
                    type="submit"
                    className="w-full py-4 bg-primary text-white font-heading font-bold rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                    <Check size={20} />
                    {isEditMode ? '儲存變更' : '儲存消費'}
                </button>
            </form >
        </div >
    );
}
