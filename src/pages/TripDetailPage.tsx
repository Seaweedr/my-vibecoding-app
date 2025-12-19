import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStorage } from '../context/StorageContext';
import { ArrowLeft, Settings, Plus, Copy, X, Clock, Receipt, Trash2, Share2, Image as ImageIcon, TrendingUp, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { BottomNav } from '../components/BottomNav';
import { calculateBalances, calculateSettlements } from '../lib/settlement';
import type { CurrencyCode } from '../types';

export function TripDetailPage() {
    const { tripId } = useParams<{ tripId: string }>();
    const navigate = useNavigate();
    const { trips, getTripExpenses, deleteExpense, deleteTrip, updateTrip, getTripCompanions, addCompanion, removeCompanion, settings } = useStorage();
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'balances'>('overview');

    // Modals State
    const [showSettings, setShowSettings] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<{ id: string; name: string } | null>(null);
    const [showDeleteTripConfirm, setShowDeleteTripConfirm] = useState(false);
    const [showCoverUrlInput, setShowCoverUrlInput] = useState(false);

    // Edit State
    const [editName, setEditName] = useState('');
    const [editCover, setEditCover] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editCurrency, setEditCurrency] = useState<CurrencyCode>('TWD');

    const trip = trips.find(t => t.id === tripId);

    if (!trip) return <div>Trip not found</div>;

    const expenses = getTripExpenses(trip.id);
    const companions = getTripCompanions(trip.id);

    // Parallax Effect State
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSaveSettings = () => {
        updateTrip(trip.id, {
            name: editName,
            coverImage: editCover || undefined,
            startDate: new Date(editStartDate),
            endDate: new Date(editEndDate),
            currency: editCurrency
        });
        setShowSettings(false);
    };

    const handleDeleteTrip = () => {
        setShowSettings(false);
        setShowDeleteTripConfirm(true);
    };

    const confirmDeleteTrip = () => {
        deleteTrip(trip.id);
        navigate('/trips');
    };

    const handleDeleteExpense = (expenseId: string, expenseName: string) => {
        setExpenseToDelete({ id: expenseId, name: expenseName });
        setShowDeleteConfirm(true);
    };

    const confirmDeleteExpense = () => {
        if (expenseToDelete) {
            deleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
            setShowDeleteConfirm(false);
        }
    };

    // Calculate opacity and transform for parallax
    const textTransform = `translateY(${scrollY * -0.4}px)`;
    const textOpacity = Math.max(0, 1 - scrollY / (window.innerHeight * 0.3));
    const hasCover = !!trip.coverImage;
    const buttonClass = "bg-white/10 backdrop-blur-md border border-white/20 text-white active:bg-white/20";

    return (
        <>
            <div className="min-h-screen bg-bg pb-safe">
                {/* Full Screen Banner Area (Fixed Background) */}
                <div className={`fixed top-0 left-0 w-full h-[50vh] z-0 ${hasCover ? 'bg-gray-900' : 'bg-[#0E4F32]'}`}>
                    {hasCover ? (
                        <>
                            <img
                                src={trip.coverImage}
                                alt={trip.name}
                                className="w-full h-full object-cover opacity-80"
                            />
                            {/* Gradient Overlay only for image */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1A8C56] to-[#0D4428] relative overflow-hidden">
                            <div className="absolute inset-0 bg-black/10" />
                            <img
                                src="/assets/travel_hero.png"
                                alt="Default Banner"
                                className="w-64 h-64 object-contain opacity-40 drop-shadow-2xl animate-bounce-slow"
                            />
                        </div>
                    )}

                    {/* Centered Title with Parallax */}
                    <div
                        className="absolute inset-0 w-full flex flex-col items-center justify-center text-center p-8 transition-transform duration-75 ease-out will-change-transform"
                        style={{
                            transform: textTransform,
                            opacity: textOpacity
                        }}
                    >
                        {trip.country && (
                            <div className="text-white text-xs font-bold mb-2 uppercase tracking-widest bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 mx-auto">
                                📍 {trip.country}
                            </div>
                        )}
                        <h1 className="font-heading font-black text-4xl tracking-tight w-full text-white drop-shadow-xl shadow-black/50">
                            {trip.name}
                        </h1>
                        <p className="text-sm font-bold mt-2 text-white/90 drop-shadow-md">
                            {format(trip.startDate, 'yyyy.MM.dd')} — {format(trip.endDate, 'yyyy.MM.dd')}
                        </p>
                    </div>

                    {/* Navbar Actions (Fixed with Banner) */}
                    <div className="absolute top-0 left-0 right-0 z-20 flex justify-between px-4 pt-4 md:pt-6">
                        <button
                            onClick={() => navigate('/trips')}
                            className={`p-3 rounded-full transition-all active:scale-95 ${buttonClass}`}
                        >
                            <ArrowLeft size={24} />
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowInvite(true)}
                                className={`p-3 rounded-full transition-all active:scale-95 ${buttonClass}`}
                            >
                                <Users size={24} />
                            </button>
                            <button
                                onClick={() => {
                                    setEditName(trip.name);
                                    setEditCover(trip.coverImage || '');
                                    setEditStartDate(format(trip.startDate, 'yyyy-MM-dd'));
                                    setEditEndDate(format(trip.endDate, 'yyyy-MM-dd'));
                                    setEditCurrency(trip.currency);
                                    setShowSettings(true);
                                }}
                                className={`p-3 rounded-full transition-all active:scale-95 ${buttonClass}`}
                            >
                                <Settings size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Spacer for Fixed Banner */}
                <div className="h-[50vh] w-full" />

                {/* Content Sheet Overlap */}
                <div className="relative z-10 -mt-12 bg-white rounded-t-[32px] min-h-[60vh] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden">

                    {/* Drag Handle Indicator */}
                    <div className="w-full flex justify-center pt-3 pb-1">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-2" />
                    </div>

                    {/* Tabs */}
                    <div className="flex px-6 border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={cn(
                                "flex-1 py-4 text-sm font-medium transition-colors relative text-center",
                                activeTab === 'overview' ? "text-primary font-bold" : "text-text-secondary"
                            )}
                        >
                            總覽
                            {activeTab === 'overview' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full mx-10" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={cn(
                                "flex-1 py-4 text-sm font-medium transition-colors relative text-center",
                                activeTab === 'timeline' ? "text-primary font-bold" : "text-text-secondary"
                            )}
                        >
                            時光軸
                            {activeTab === 'timeline' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full mx-10" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('balances')}
                            className={cn(
                                "flex-1 py-4 text-sm font-medium transition-colors relative text-center",
                                activeTab === 'balances' ? "text-primary font-bold" : "text-text-secondary"
                            )}
                        >
                            結算
                            {activeTab === 'balances' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full mx-10" />
                            )}
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="pb-32">
                        {activeTab === 'overview' ? (
                            <div className="space-y-4">
                                {/* Story Entry Button */}
                                <div className="px-6 pt-6">
                                    <Link to={`/story/${trip.id}`} className="block">
                                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-[20px] p-4 text-white shadow-lg active:scale-[0.98] transition-all flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl backdrop-blur-sm group-active:scale-110 transition-transform">
                                                    ✨
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg">旅程回顧</h3>
                                                    <p className="text-white/60 text-xs font-medium">查看統計數據與足跡</p>
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                                <ArrowLeft size={16} className="rotate-180" />
                                            </div>
                                        </div>
                                    </Link>
                                </div>

                                {/* Widgets Area */}
                                <div className="px-6 grid grid-cols-1 gap-4">


                                    {/* Exchange Rate Widget */}
                                    {trip.currency !== 'TWD' && (
                                        <div className="bg-blue-50 p-4 rounded-[20px] flex gap-3 items-start border border-blue-100">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex-shrink-0 flex items-center justify-center">
                                                <TrendingUp size={16} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-blue-900 text-sm">匯率參考</h4>
                                                <p className="text-xs text-blue-700 mt-1">
                                                    1 {trip.currency} ≈ 0.22 TWD
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Daily Stats */}
                                {expenses.length > 0 ? (
                                    <div className="space-y-0 divide-y divide-gray-50">
                                        {Object.entries(
                                            expenses.reduce((acc, expense) => {
                                                const dateKey = format(new Date(expense.date), 'yyyy-MM-dd');
                                                if (!acc[dateKey]) acc[dateKey] = [];
                                                acc[dateKey].push(expense);
                                                return acc;
                                            }, {} as Record<string, typeof expenses>)
                                        ).sort((a, b) => b[0].localeCompare(a[0])).map(([date, dayExpenses]) => {
                                            const currencyCounts = dayExpenses.reduce((acc, e) => {
                                                acc[e.currency] = (acc[e.currency] || 0) + 1;
                                                return acc;
                                            }, {} as Record<string, number>);

                                            const predominantCurrency = Object.keys(currencyCounts).reduce((a, b) => currencyCounts[a] > currencyCounts[b] ? a : b) as any;

                                            const totalInPredominant = dayExpenses
                                                .filter(e => e.currency === predominantCurrency)
                                                .reduce((sum, e) => sum + e.amount, 0);

                                            return (
                                                <div key={date} className="pb-8">
                                                    {/* Sticky Date Header - Clean & Modern */}
                                                    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md py-4 px-5 mb-2 flex justify-between items-center transition-all">
                                                        <h4 className="font-heading font-bold text-xl text-text flex items-center gap-2">
                                                            {format(new Date(date), 'MM.dd')}
                                                            <span className="text-sm font-medium text-text-secondary uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-md">
                                                                {format(new Date(date), 'EEE')}
                                                            </span>
                                                        </h4>
                                                        <div className="text-right">
                                                            <span className="text-xs font-bold text-text-secondary bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
                                                                {new Intl.NumberFormat('en-US', {
                                                                    style: 'currency',
                                                                    currency: predominantCurrency,
                                                                    maximumFractionDigits: 0
                                                                }).format(totalInPredominant)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Content Card - Wrapped in a unified block */}
                                                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50 mx-5">
                                                        {dayExpenses.map(expense => (
                                                            <div
                                                                key={expense.id}
                                                                onClick={() => {
                                                                    navigate(`/trips/${trip.id}/add-expense?expenseId=${expense.id}`);
                                                                }}
                                                                className="flex justify-between items-center group relative p-5 hover:bg-gray-50/80 active:bg-gray-100 transition-colors cursor-pointer"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    {/* Category Icon Integration */}
                                                                    <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-xl shrink-0">
                                                                        {expense.category === 'food' ? '🍜' :
                                                                            expense.category === 'transport' ? '🚌' :
                                                                                expense.category === 'accommodation' ? '🏨' :
                                                                                    expense.category === 'shopping' ? '🛍️' : '🏷️'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-text text-[15px] leading-tight mb-1">{expense.merchant}</div>
                                                                        <div className="text-[11px] text-text-secondary flex items-center gap-1.5 font-medium">
                                                                            <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">
                                                                                {format(new Date(expense.date), 'HH:mm')}
                                                                            </span>
                                                                            {expense.items && expense.items.length > 0 && <span>{expense.items.length} items</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3 pl-2">
                                                                    <span className="font-heading font-bold text-text text-base">
                                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency }).format(expense.amount)}
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteExpense(expense.id, expense.merchant);
                                                                        }}
                                                                        className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all -mr-2"
                                                                        title="刪除"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-text-secondary">
                                        <Receipt size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>還沒有消費記錄</p>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'timeline' ? (
                            <div className="space-y-4">
                                <div className="bg-surface rounded-[24px] p-6 text-center shadow-sm">
                                    <Clock size={40} className="mx-auto text-primary mb-2" />
                                    <h3 className="font-bold text-text">時光軸功能</h3>
                                    <p className="text-sm text-text-secondary mt-2">將您的收據與照片結合成時間軸故事。</p>
                                </div>
                            </div>
                        ) : (
                            <div className="px-6 pt-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {(() => {
                                    const memberBalances = calculateBalances(expenses, companions, trip.currency);
                                    const settlementSuggestions = calculateSettlements(memberBalances);

                                    return (
                                        <>
                                            {/* Balances List */}
                                            <section className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-heading font-black text-xl text-text">個人餘額</h3>
                                                    <div className="text-[10px] uppercase font-black tracking-widest text-gray-400">Net Balance</div>
                                                </div>
                                                <div className="bg-gray-50 rounded-[24px] border border-gray-100 p-2 space-y-1">
                                                    {memberBalances.map(mb => (
                                                        <div key={mb.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-50">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                                                                    mb.net > 0 ? "bg-green-100 text-green-600" : mb.net < 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"
                                                                )}>
                                                                    {mb.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-text">{mb.name}</div>
                                                                    <div className="text-[10px] font-medium text-text-secondary">已付: {new Intl.NumberFormat('en-US').format(mb.paid)} | 應付: {new Intl.NumberFormat('en-US').format(mb.shouldPay)}</div>
                                                                </div>
                                                            </div>
                                                            <div className={cn(
                                                                "font-heading font-black text-sm",
                                                                mb.net > 0 ? "text-green-500" : mb.net < 0 ? "text-red-500" : "text-gray-300"
                                                            )}>
                                                                {mb.net > 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: trip.currency }).format(mb.net)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>

                                            {/* Settlement Suggestions */}
                                            <section className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-heading font-black text-xl text-text">還款建議</h3>
                                                    <div className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider">Optimized</div>
                                                </div>

                                                {settlementSuggestions.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {settlementSuggestions.map((s, idx) => (
                                                            <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm relative overflow-hidden group">
                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20" />
                                                                <div className="flex-1 text-center">
                                                                    <div className="text-[10px] font-black text-gray-400 uppercase mb-1">From</div>
                                                                    <div className="font-bold text-text truncate">{s.fromName}</div>
                                                                </div>
                                                                <div className="flex flex-col items-center gap-1 shrink-0">
                                                                    <div className="font-black text-primary text-sm whitespace-nowrap">
                                                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: trip.currency }).format(s.amount)}
                                                                    </div>
                                                                    <ArrowLeft className="rotate-180 text-primary animate-pulse" size={20} />
                                                                </div>
                                                                <div className="flex-1 text-center">
                                                                    <div className="text-[10px] font-black text-gray-400 uppercase mb-1">To</div>
                                                                    <div className="font-bold text-text truncate">{s.toName}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="bg-green-50 border border-green-100 rounded-[24px] p-8 text-center space-y-2">
                                                        <div className="text-3xl">✨</div>
                                                        <div className="font-bold text-green-900">帳目已清！</div>
                                                        <p className="text-xs text-green-700">大家都不互相欠錢，太棒了。</p>
                                                    </div>
                                                )}

                                                <button className="w-full py-4 bg-gray-50 border border-dashed border-gray-300 rounded-[20px] text-xs font-black text-gray-400 hover:border-primary hover:text-primary transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">
                                                    <Share2 size={14} />
                                                    複製結算明細分享至 LINE
                                                </button>
                                            </section>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Action Button */}
                <Link
                    to={`/trips/${tripId}/add-expense`}
                    className="fixed bottom-24 right-6 w-16 h-16 bg-primary text-white rounded-full shadow-lg shadow-primary/40 flex items-center justify-center active:scale-90 transition-transform z-50 hover:bg-primary-dark"
                    style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <Plus size={36} />
                </Link>

                {/* Settings Modal - Updated with Dates and Currency */}
                {showSettings && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSettings(false)} />
                        <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                            <div className="p-6 space-y-6">
                                <div className="text-center">
                                    <h2 className="text-xl font-bold text-text">旅程設定</h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-text-secondary">旅程名稱</label>
                                        <input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full p-3 bg-gray-50 rounded-[16px] text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                    </div>

                                    {/* Dates */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-text-secondary flex items-center gap-1">
                                                <Calendar size={12} />
                                                開始日期
                                            </label>
                                            <input
                                                type="date"
                                                value={editStartDate}
                                                onChange={(e) => setEditStartDate(e.target.value)}
                                                className="w-full p-3 bg-gray-50 rounded-[16px] text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-text-secondary flex items-center gap-1">
                                                <Calendar size={12} />
                                                結束日期
                                            </label>
                                            <input
                                                type="date"
                                                value={editEndDate}
                                                onChange={(e) => setEditEndDate(e.target.value)}
                                                className="w-full p-3 bg-gray-50 rounded-[16px] text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Currency */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-text-secondary">主要貨幣</label>
                                        <div className="relative">
                                            <select
                                                value={editCurrency}
                                                onChange={(e) => setEditCurrency(e.target.value as CurrencyCode)}
                                                className="w-full p-3 bg-gray-50 rounded-[16px] text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                                            >
                                                <option value="TWD">TWD 台幣</option>
                                                <option value="JPY">JPY 日幣</option>
                                                <option value="USD">USD 美金</option>
                                                <option value="EUR">EUR 歐元</option>
                                                <option value="KRW">KRW 韓元</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-text-secondary">封面圖片</label>
                                        {showCoverUrlInput ? (
                                            <div className="space-y-2">
                                                <input
                                                    value={editCover}
                                                    onChange={(e) => setEditCover(e.target.value)}
                                                    placeholder="https://..."
                                                    className="w-full p-3 bg-gray-50 rounded-[16px] text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => setShowCoverUrlInput(false)}
                                                    className="w-full py-2 bg-gray-100 text-text rounded-[12px] text-xs font-medium hover:bg-gray-200 transition-colors"
                                                >
                                                    完成
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <label className="flex-1 cursor-pointer">
                                                    <div className="w-full p-3 bg-gray-50 rounded-[16px] text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-text-secondary">
                                                        <ImageIcon size={16} />
                                                        上傳
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => {
                                                                    setEditCover(reader.result as string);
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                        className="hidden"
                                                    />
                                                </label>
                                                <button
                                                    onClick={() => setShowCoverUrlInput(true)}
                                                    className="flex-1 p-3 bg-gray-50 rounded-[16px] text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-text-secondary"
                                                >
                                                    <ImageIcon size={16} />
                                                    網址
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                                    <button
                                        onClick={handleSaveSettings}
                                        className="w-full py-4 bg-black text-white rounded-[20px] font-bold text-sm hover:bg-gray-800 active:scale-95 transition-transform"
                                    >
                                        儲存變更
                                    </button>
                                    <button
                                        onClick={handleDeleteTrip}
                                        className="w-full py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-[16px] transition-colors"
                                    >
                                        刪除旅程
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Companions / Invite Modal */}
                {showInvite && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowInvite(false)} />
                        <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                            <div className="p-6 space-y-6">
                                <div className="text-center">
                                    <h2 className="text-xl font-bold text-text flex items-center justify-center gap-2">
                                        <Users size={24} className="text-primary" />
                                        旅伴管理
                                    </h2>
                                    <p className="text-sm text-text-secondary mt-1">管理此旅程的同行夥伴</p>
                                </div>

                                {/* Current Companions List */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-secondary">目前旅伴</label>
                                    <div className="flex flex-wrap gap-2">
                                        <button className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-sm">
                                            我
                                        </button>
                                        {companions.map(c => (
                                            <div key={c.id} className="relative group animate-in zoom-in duration-200">
                                                <div className="px-3 py-2 bg-gray-50 border border-gray-100 text-text rounded-xl text-sm font-bold flex items-center gap-2">
                                                    {c.name}
                                                    <button
                                                        onClick={() => removeCompanion(c.id)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {companions.length === 0 && (
                                            <span className="text-sm text-gray-400 py-2">還沒有加入其他人</span>
                                        )}
                                    </div>
                                </div>

                                {/* Frequent Companions */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-text-secondary">常用旅伴 (快速加入)</label>
                                        <Link to="/settings/companions" className="text-xs text-primary font-bold">管理名單</Link>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {settings.frequentCompanions && settings.frequentCompanions.length > 0 ? (
                                            settings.frequentCompanions.map((name) => {
                                                const isAlreadyIn = companions.some(c => c.name === name);
                                                if (isAlreadyIn) return null; // Don't show if already added

                                                return (
                                                    <button
                                                        key={name}
                                                        onClick={() => addCompanion(trip.id, name)}
                                                        className="px-3 py-2 bg-white border border-dashed border-gray-300 text-text rounded-xl text-sm font-medium hover:border-primary hover:text-primary transition-all active:scale-95 flex items-center gap-1"
                                                    >
                                                        <Plus size={14} />
                                                        {name}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <span className="text-sm text-gray-400">去設定新增常用旅伴</span>
                                        )}
                                        {settings.frequentCompanions?.every(name => companions.some(c => c.name === name)) && settings.frequentCompanions.length > 0 && (
                                            <span className="text-xs text-gray-400 py-1">都在名單內囉！</span>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-primary/5 rounded-[24px] p-4 text-center space-y-3 border border-primary/10 mt-2">
                                    <div>
                                        <h3 className="font-bold text-primary text-sm">邀請連結</h3>
                                        <p className="text-[10px] text-text-secondary mt-0.5">
                                            分享連結，邀請朋友一起編輯
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="flex-1 py-2.5 bg-white border border-gray-200 rounded-[12px] text-xs font-bold text-text shadow-sm hover:bg-gray-50 active:scale-95 transition-transform flex items-center justify-center gap-2">
                                            <Copy size={14} />
                                            複製
                                        </button>
                                        <button className="flex-1 py-2.5 bg-primary text-white rounded-[12px] text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-dark active:scale-95 transition-transform flex items-center justify-center gap-2">
                                            <Share2 size={14} />
                                            分享
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowInvite(false)} className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Delete Expense Confirmation Modal */}
                {showDeleteConfirm && expenseToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowDeleteConfirm(false)} />
                        <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                            <div className="p-6 space-y-6">
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
                                        <Trash2 size={32} className="text-red-500" />
                                    </div>
                                    <h2 className="text-xl font-bold text-text">確定要刪除嗎？</h2>
                                    <p className="text-sm text-text-secondary">
                                        確定要刪除「{expenseToDelete.name}」這筆款項嗎？
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 py-4 bg-gray-100 text-text rounded-[20px] font-bold text-sm hover:bg-gray-200 active:scale-95 transition-transform"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={confirmDeleteExpense}
                                        className="flex-1 py-4 bg-red-500 text-white rounded-[20px] font-bold text-sm hover:bg-red-600 active:scale-95 transition-transform"
                                    >
                                        刪除
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Trip Confirmation Modal */}
                {showDeleteTripConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowDeleteTripConfirm(false)} />
                        <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                            <div className="p-6 space-y-6">
                                <div className="text-center space-y-2">
                                    <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
                                        <Trash2 size={32} className="text-red-500" />
                                    </div>
                                    <h2 className="text-xl font-bold text-text">確定要刪除旅程嗎？</h2>
                                    <p className="text-sm text-text-secondary">
                                        刪除「{trip.name}」後，所有相關的消費記錄也會一併刪除。此動作無法復原。
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteTripConfirm(false)}
                                        className="flex-1 py-4 bg-gray-100 text-text rounded-[20px] font-bold text-sm hover:bg-gray-200 active:scale-95 transition-transform"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={confirmDeleteTrip}
                                        className="flex-1 py-4 bg-red-500 text-white rounded-[20px] font-bold text-sm hover:bg-red-600 active:scale-95 transition-transform"
                                    >
                                        刪除旅程
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <BottomNav />
        </>
    );
}
