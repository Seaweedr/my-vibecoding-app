import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Plus } from 'lucide-react';
import { useStorage } from '../../context/StorageContext';

export function SettingsCompanionsPage() {
    const navigate = useNavigate();
    const { settings, updateSettings } = useStorage();
    const [newCompanion, setNewCompanion] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const companions = settings.frequentCompanions || [];

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCompanion.trim()) {
            updateSettings({
                frequentCompanions: [...companions, newCompanion.trim()]
            });
            setNewCompanion('');
            setIsAdding(false);
        }
    };

    const handleDelete = (index: number) => {
        const newCompanions = [...companions];
        newCompanions.splice(index, 1);
        updateSettings({ frequentCompanions: newCompanions });
    };

    return (
        <div className="min-h-screen bg-bg pb-safe">
            <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-black/5 px-4 h-14 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:bg-black/5 transition-colors">
                    <ArrowLeft size={24} className="text-text" />
                </button>
                <h1 className="font-heading font-bold text-lg text-text">常用旅伴</h1>
            </header>

            <main className="p-4 space-y-4">
                {/* List */}
                {companions.length > 0 ? (
                    <div className="bg-surface rounded-[24px] overflow-hidden shadow-sm">
                        {companions.map((name, index) => (
                            <div key={index} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-accent/20 text-accent-dark flex items-center justify-center font-bold text-lg">
                                        {name[0]}
                                    </div>
                                    <span className="font-bold text-text">{name}</span>
                                </div>
                                <button
                                    onClick={() => handleDelete(index)}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-text-secondary bg-surface/50 rounded-[24px] border border-dashed border-gray-200">
                        <UserPlus size={48} className="mx-auto mb-4 opacity-20" />
                        <p>還沒有新增常用旅伴</p>
                        <p className="text-xs mt-1">設定後，建立旅程時可以快速選擇這些朋友</p>
                    </div>
                )}

                {/* Add Input */}
                {isAdding ? (
                    <form onSubmit={handleAdd} className="bg-surface rounded-[24px] p-2 shadow-sm border border-primary/20 flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                        <input
                            autoFocus
                            type="text"
                            value={newCompanion}
                            onChange={(e) => setNewCompanion(e.target.value)}
                            placeholder="輸入朋友名字..."
                            className="flex-1 p-3 bg-transparent outline-none font-bold"
                        />
                        <button
                            type="submit"
                            className="bg-primary text-white px-6 rounded-[18px] font-bold text-sm shadow-sm"
                        >
                            新增
                        </button>
                    </form>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full py-4 bg-white border-2 border-dashed border-gray-200 text-text-secondary font-bold rounded-[24px] flex items-center justify-center gap-2 hover:border-primary/50 hover:text-primary transition-colors active:scale-95"
                    >
                        <Plus size={20} />
                        新增旅伴
                    </button>
                )}
            </main>
        </div>
    );
}
