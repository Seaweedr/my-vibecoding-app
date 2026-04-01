import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../context/StorageContext';
import { ArrowLeft } from 'lucide-react';
import type { CurrencyCode } from '../types';
import { getCurrencyForCountry } from '../lib/currency';
import { cn } from '../lib/utils';

// Define RECOMMENDED_FRIENDS as it's used in the instruction but not provided in the original code.
// Assuming it's an array of strings.
const RECOMMENDED_FRIENDS: string[] = [];

export function CreateTripPage() {
    const navigate = useNavigate();
    const { addTrip, settings } = useStorage();

    const [formData, setFormData] = useState({
        name: '',
        country: '',
        startDate: '',
        endDate: '',
        budget: '',
        companions: '',
        coverImage: ''
    });
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('TWD'); // Default, will update with country

    const [selectedCompanions, setSelectedCompanions] = useState<string[]>([]);

    // Combine hardcoded friends with user's frequent companions (deduplicated)
    const availableFriends = Array.from(new Set([...RECOMMENDED_FRIENDS, ...(settings.frequentCompanions || [])]));

    const toggleCompanion = (name: string) => {
        setSelectedCompanions(prev => {
            let next;
            if (prev.includes(name)) {
                next = prev.filter(c => c !== name);
            } else {
                next = [...prev, name];
            }

            // Sync with formData
            setFormData(data => ({
                ...data,
                companions: next.join(', ')
            }));
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const companionList = formData.companions
            .split(/[,，]/) // Support both comma types
            .map(s => s.trim())
            .filter(s => s.length > 0);

        addTrip({
            name: formData.name,
            startDate: new Date(formData.startDate),
            endDate: new Date(formData.endDate),
            country: formData.country,
            currency: selectedCurrency, // Use state currency
            budget: Number(formData.budget) || 0,
            coverImage: formData.coverImage,
            companions: [] // Type satisfaction, real companions added via 2nd arg
        }, companionList);
        navigate('/trips');
    };

    const currencies: CurrencyCode[] = ['TWD', 'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'KRW'];

    return (
        <div className="space-y-6 px-4 pt-6 pb-20">
            <header className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-heading font-bold text-text">新增旅程</h1>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">旅程名稱</label>
                        <input
                            required
                            type="text"
                            placeholder="例如：東京賞櫻"
                            className="w-full p-4 bg-white rounded-[20px] border border-gray-200 outline-none font-medium focus:ring-2 focus:ring-primary"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">開始日期</label>
                            <input
                                required
                                type="date"
                                className="w-full p-4 bg-white rounded-[20px] border border-gray-200 outline-none"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">結束日期</label>
                            <input
                                required
                                type="date"
                                className="w-full p-4 bg-white rounded-[20px] border border-gray-200 outline-none"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">目的地國家</label>
                        <input
                            type="text"
                            placeholder="例如：日本"
                            className="w-full p-4 bg-white rounded-[20px] border border-gray-200 outline-none"
                            value={formData.country}
                            onChange={e => {
                                const val = e.target.value;
                                const detected = getCurrencyForCountry(val);
                                setFormData(prev => ({ ...prev, country: val })); // Only update country here
                                if (detected) setSelectedCurrency(detected); // Update currency state
                            }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">推薦旅伴</label>
                        <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
                            {availableFriends.map(friend => (
                                <button
                                    type="button"
                                    key={friend}
                                    onClick={() => toggleCompanion(friend)}
                                    className={cn(
                                        "flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border-2",
                                        selectedCompanions.includes(friend)
                                            ? "bg-primary text-white border-primary shadow-deep scale-105"
                                            : "bg-white text-text-secondary border-transparent hover:bg-gray-50"
                                    )}
                                >
                                    {friend}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">主要貨幣</label>
                        <select
                            className="w-full p-4 bg-white rounded-[20px] border border-gray-200 outline-none appearance-none"
                            value={selectedCurrency}
                            onChange={e => setSelectedCurrency(e.target.value as CurrencyCode)}
                        >
                            {currencies.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">總預算 (選填)</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            className="w-full p-4 bg-white rounded-[20px] border border-gray-200 outline-none"
                            value={formData.budget}
                            onChange={e => setFormData({ ...formData, budget: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">同行旅伴 (選填)</label>
                        <input
                            type="text"
                            placeholder="請用逗號分隔姓名 (例如：小明, 小美)"
                            className="w-full p-4 bg-white rounded-[20px] border border-gray-200 outline-none"
                            value={formData.companions}
                            onChange={e => setFormData({ ...formData, companions: e.target.value })}
                        />
                        <p className="text-xs text-text-secondary mt-1 pl-1">這些人將可用於分攤帳單。</p>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-heading font-semibold text-text mb-2">封面圖片 URL (選填)</label>
                    <input
                        type="text"
                        placeholder="https://example.com/image.jpg"
                        className="w-full p-4 rounded-[20px] border border-gray-200 outline-none transition-all placeholder:text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        value={formData.coverImage || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                    />
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="w-full py-4 bg-primary text-white font-heading font-bold rounded-[20px] shadow-deep active:scale-95 transition-transform"
                    >
                        建立新旅程
                    </button>
                </div>
            </form>
        </div>
    );
}
