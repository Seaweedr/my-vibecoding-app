import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Plus, X, Image as ImageIcon, Calendar, MapPin, Check } from 'lucide-react';
import { useStorage } from '../context/StorageContext';
import { TripCard } from '../components/TripCard';
import { format } from 'date-fns';
import { convertCurrency, getCurrencyForCountry } from '../lib/currency';
import type { CurrencyCode } from '../types';

// Hardcoded for demo - usually this would come from User's Contacts or recent selection
const RECOMMENDED_FRIENDS = [
    { id: '1', name: 'Alice', avatar: '👩' },
    { id: '2', name: 'Bob', avatar: '👨' },
    { id: '3', name: 'Charlie', avatar: '🧑' },
    { id: '4', name: 'Dave', avatar: '👱' },
];

export function TripsPage() {
    const { trips, addTrip, getTripExpenses, settings } = useStorage();
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [country, setCountry] = useState('');
    const [currency, setCurrency] = useState<CurrencyCode>('TWD');
    const [coverImage, setCoverImage] = useState('');
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [budget, setBudget] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);

    const touchStartY = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartY.current !== null) {
            const touchEndY = e.changedTouches[0].clientY;
            const distance = touchEndY - touchStartY.current;

            // Threshold for closing
            if (distance > 100) {
                setShowCreateModal(false);
            }
        }
        touchStartY.current = null;
    };

    const resetForm = () => {
        setName('');
        setStartDate(format(new Date(), 'yyyy-MM-dd'));
        setEndDate(format(new Date(), 'yyyy-MM-dd'));
        setCountry('');
        setCurrency('TWD');
        setCoverImage('');
        setSelectedFriends([]);
        setBudget('');
        setShowUrlInput(false);
    };

    const handleCreateTrip = () => {
        if (!name) return; // Basic validation

        const companions = selectedFriends.map(id => {
            // Check if it is a stored friend (formatted as 'stored-Name')
            if (id.startsWith('stored-')) {
                return id.replace('stored-', '');
            }
            // Fallback for hardcoded RECOMMENDED_FRIENDS (if kept for demo)
            const friend = RECOMMENDED_FRIENDS.find(f => f.id === id);
            return friend ? friend.name : id;
        }).filter(Boolean);

        addTrip({
            name,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            country,
            currency,
            budget: Number(budget) || 0,
            companions,
            coverImage: coverImage || undefined,
        });

        setShowCreateModal(false);
        resetForm();
    };

    const toggleFriend = (id: string) => {
        if (selectedFriends.includes(id)) {
            setSelectedFriends(selectedFriends.filter(fid => fid !== id));
        } else {
            setSelectedFriends([...selectedFriends, id]);
        }
    };

    return (
        <>
            <div className="space-y-6 px-4 pt-6 pb-24">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-text font-heading tracking-tight">我的旅程</h1>
                        <p className="text-sm text-text-secondary mt-1 font-medium">
                            {trips.length} 個精彩回憶
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-full shadow-lg shadow-primary/20 hover:shadow-xl active:scale-95 transition-all font-bold text-sm"
                    >
                        <Plus size={18} />
                        新增旅程
                    </button>
                </header>

                {trips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 mt-12 text-center space-y-4 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                            <span className="text-4xl">🌍</span>
                        </div>
                        <h3 className="text-lg font-bold text-text">還沒有旅程</h3>
                        <p className="text-text-secondary text-xs">
                            點擊右上角 + 號建立新旅程
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {trips.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(trip => {
                            const tripExpenses = getTripExpenses(trip.id);
                            const total = tripExpenses.reduce((acc, curr) => {
                                return acc + convertCurrency(curr.amount, curr.currency, trip.currency);
                            }, 0);

                            return (
                                <TripCard
                                    key={trip.id}
                                    trip={trip}
                                    expenseCount={tripExpenses.length}
                                    totalSpend={total}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Trip Modal - Full Screen Bottom Sheet (Portal) */}
            {showCreateModal && createPortal(
                <div className="fixed inset-0 z-[5000]">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setShowCreateModal(false)}
                    />

                    {/* Modal Content - Full Screen */}
                    <div className="absolute inset-0 bg-white shadow-2xl flex flex-col h-[100dvh] animate-in slide-in-from-bottom duration-500 ease-out">

                        {/* Drag Handle Container - Interactive */}
                        <div
                            className="absolute top-0 left-0 right-0 h-12 z-20 flex items-center justify-center touch-none"
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            <div className="w-12 h-1.5 bg-white/30 rounded-full shadow-sm" />
                        </div>

                        {/* Scrollable Container */}
                        <div className="flex-1 overflow-y-auto bg-gray-50/50 no-scrollbar">

                            {/* Top Section: Cover Image (Now inside scroll view) */}
                            <div
                                className="relative h-64 shrink-0 bg-gray-900 group transition-transform duration-100 ease-linear"
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                            >
                                {coverImage ? (
                                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover opacity-90" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white/30">
                                        <ImageIcon size={64} className="opacity-40" />
                                    </div>
                                )}

                                {/* Actions Overlay */}
                                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20">
                                    {showUrlInput ? (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                            <input
                                                type="text"
                                                placeholder="貼上圖片網址 https://..."
                                                value={coverImage.startsWith('data:') ? '' : coverImage}
                                                onChange={(e) => setCoverImage(e.target.value)}
                                                className="w-full bg-white/20 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-white/30 placeholder:text-white/50 focus:outline-none focus:bg-white/30 transition-all font-medium"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowUrlInput(false)}
                                                    className="flex-1 bg-white/10 text-white py-3 rounded-xl font-bold border border-white/20 hover:bg-white/20 transition-all"
                                                >
                                                    取消
                                                </button>
                                                <button
                                                    onClick={() => setShowUrlInput(false)}
                                                    className="flex-[2] bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                                                >
                                                    完成
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <label className="flex-1 cursor-pointer">
                                                <div className="bg-white/20 backdrop-blur-md text-white h-12 rounded-xl border border-white/30 hover:bg-white/30 transition-all flex items-center justify-center gap-2 font-bold active:scale-[0.98]">
                                                    <ImageIcon size={18} />
                                                    上傳照片
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => setCoverImage(reader.result as string);
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                            </label>
                                            <button
                                                onClick={() => setShowUrlInput(true)}
                                                className="flex-1 bg-white/20 backdrop-blur-md text-white h-12 rounded-xl border border-white/30 hover:bg-white/30 transition-all flex items-center justify-center gap-2 font-bold active:scale-[0.98]"
                                            >
                                                <ImageIcon size={18} />
                                                圖片網址
                                            </button>
                                            {coverImage && (
                                                <button
                                                    onClick={() => setCoverImage('')}
                                                    className="w-12 h-12 bg-red-500/80 backdrop-blur-md text-white rounded-xl hover:bg-red-600/80 transition-colors flex items-center justify-center active:scale-95"
                                                >
                                                    <X size={20} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/40 transition-colors active:scale-95 z-30"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-8 pb-32">
                                {/* Basic Info */}
                                <div className="space-y-6 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-text-secondary px-1">旅程名稱</label>
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="例如：東京賞櫻"
                                            className="w-full text-2xl font-black text-text placeholder:text-gray-300 border-b-2 border-gray-100 py-2 focus:outline-none focus:border-primary transition-colors bg-transparent"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-text-secondary px-1 flex items-center gap-1.5">
                                                <Calendar size={14} />
                                                開始日期
                                            </label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-text outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-text-secondary px-1 flex items-center gap-1.5">
                                                <Calendar size={14} />
                                                結束日期
                                            </label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-text outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-text-secondary px-1 flex items-center gap-1.5">
                                                <MapPin size={14} />
                                                地點
                                            </label>
                                            <input
                                                value={country}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setCountry(val);
                                                    const detected = getCurrencyForCountry(val);
                                                    if (detected) setCurrency(detected);
                                                }}
                                                placeholder="國家 / 城市"
                                                className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-text outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:font-normal"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-text-secondary px-1">貨幣</label>
                                            <div className="relative">
                                                <select
                                                    value={currency}
                                                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                                                    className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-text outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none pr-10"
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
                                    </div>
                                </div>

                                {/* Companions */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-text px-1">同行旅伴</h3>

                                    {/* Frequent Companions from Settings */}
                                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-primary flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary" />
                                                常用旅伴
                                            </span>
                                            <Link to="/settings/companions" className="text-xs font-medium text-gray-400 hover:text-primary transition-colors">
                                                管理名單
                                            </Link>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            {settings.frequentCompanions && settings.frequentCompanions.length > 0 ? (
                                                settings.frequentCompanions.map((friendName) => {
                                                    // Map simple string to ID-like key
                                                    const friendId = friendName; // Use name as ID for selection
                                                    const isSelected = selectedFriends.includes(friendId);

                                                    return (
                                                        <button
                                                            key={friendId}
                                                            onClick={() => toggleFriend(friendId)}
                                                            className={`
                                                                flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all active:scale-95 duration-200
                                                                ${isSelected
                                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 translate-y-[-2px]'
                                                                    : 'bg-gray-50 text-text border-transparent hover:bg-gray-100'}
                                                            `}
                                                        >
                                                            <div className={`
                                                                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                                                ${isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}
                                                            `}>
                                                                {friendName[0]}
                                                            </div>
                                                            <span className="font-bold">{friendName}</span>
                                                            {isSelected && <Check size={16} className="animate-in zoom-in" strokeWidth={3} />}
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <div className="w-full text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                                                    還沒有設定常用旅伴
                                                    <br />
                                                    <Link to="/settings/companions" className="text-primary font-bold hover:underline mt-1 inline-block">
                                                        去設定
                                                    </Link>
                                                </div>
                                            )}

                                            {/* Add Ad-hoc Companion Button (Mock functionality for now) */}
                                            {/* The user only asked for syncing, so we focus on that. */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer - Sticky Bottom */}
                        <div className="px-6 py-4 pb-10 border-t border-gray-100 bg-white shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
                            <button
                                onClick={handleCreateTrip}
                                disabled={!name}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:bg-primary-dark hover:translate-y-[-1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 disabled:shadow-none disabled:bg-gray-200 disabled:text-gray-400"
                            >
                                建立旅程
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
