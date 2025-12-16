import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Bell, Globe, Database, HelpCircle, Shield, ChevronRight, LogOut, Edit2, Check, Camera } from 'lucide-react';
import { useStorage } from '../context/StorageContext';

const PRESET_AVATARS = ['🦄', '🐼', '🦊', '🐱', '🐶', '🦁', '🐯', '🐨', '🐷'];

export function SettingsPage() {
    const navigate = useNavigate();
    const { settings, updateSettings } = useStorage();
    const [isEditing, setIsEditing] = useState(false);

    // Initialize state from storage
    const [name, setName] = useState(settings.name || "旅行者");
    const [currency, setCurrency] = useState(settings.homeCurrency || "TWD");
    const [avatar, setAvatar] = useState('🦄'); // Ideally this should be in settings too
    const [customAvatar, setCustomAvatar] = useState<string | null>(null);

    // Save when editing finishes
    const toggleEdit = () => {
        if (isEditing) {
            updateSettings({
                name,
                homeCurrency: currency as any
                // Add avatar persistence if UserSettings type supports it
            });
        }
        setIsEditing(!isEditing);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCustomAvatar(reader.result as string);
                // Persist image if supported
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    return (
        <div className="space-y-6 px-4 pt-6 pb-24">
            <header>
                <h1 className="text-2xl font-bold text-text font-heading tracking-tight">個人設定</h1>
            </header>

            {/* Profile Section */}
            <div className="bg-white rounded-[20px] p-6 border border-gray-200 transition-all duration-300">
                <div className="flex justify-between items-start mb-2">
                    <h2 className="text-lg font-bold text-text-secondary">基本資料</h2>
                    <button
                        onClick={toggleEdit}
                        className="w-10 h-10 -mr-2 -mt-2 rounded-full hover:bg-gray-50 flex items-center justify-center text-primary transition-colors"
                    >
                        {isEditing ? <Check size={24} /> : <Edit2 size={20} />}
                    </button>
                </div>

                <div className="flex flex-col items-center gap-6">
                    {/* Avatar Section */}
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-5xl overflow-hidden border-4 border-white shadow-soft">
                            {customAvatar ? (
                                <img src={customAvatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span>{avatar}</span>
                            )}
                        </div>

                        {isEditing && (
                            <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary-dark transition-colors">
                                <Camera size={14} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            {/* Avatar Presets */}
                            <div className="flex justify-center gap-2 flex-wrap pb-4 border-b border-gray-100">
                                {PRESET_AVATARS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => { setAvatar(emoji); setCustomAvatar(null); }}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-transform hover:scale-110 ${avatar === emoji && !customAvatar ? 'bg-primary/20 ring-2 ring-primary' : 'bg-gray-50'}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-text-secondary uppercase">暱稱</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-4 bg-gray-50 rounded-[16px] font-bold text-text outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="輸入您的暱稱"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-text-secondary uppercase">慣用幣別</label>
                                <div className="relative">
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value as any)}
                                        className="w-full p-4 bg-gray-50 rounded-[16px] font-medium text-text outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                                    >
                                        <option value="TWD">TWD - 新台幣</option>
                                        <option value="USD">USD - 美金</option>
                                        <option value="JPY">JPY - 日圓</option>
                                        <option value="KRW">KRW - 韓元</option>
                                        <option value="EUR">EUR - 歐元</option>
                                    </select>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 rotate-90" size={20} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center animate-in fade-in slide-in-from-bottom-2 space-y-1">
                            <h2 className="text-2xl font-bold text-text">{name}</h2>
                            <p className="text-text-secondary font-medium bg-gray-100/50 px-3 py-1 rounded-full text-sm inline-block">
                                預設幣別: {currency}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Settings Groups */}
            <div className="space-y-4">
                <section>
                    <h3 className="px-2 mb-2 text-xs font-bold text-text-secondary uppercase tracking-wider">一般設定</h3>
                    <div className="bg-white rounded-[20px] overflow-hidden border border-gray-200">
                        <Link to="/settings/language">
                            <SettingItem icon={Globe} label="語言" value={settings.language === 'en' ? 'English' : settings.language === 'ja' ? '日本語' : '繁體中文'} />
                        </Link>
                        <Link to="/settings/backup">
                            <SettingItem icon={Database} label="備份與同步" value={settings.backupEnabled ? '開啟' : '關閉'} />
                        </Link>
                        <Link to="/settings/notifications">
                            <SettingItem icon={Bell} label="通知設定" />
                        </Link>
                    </div>
                </section>

                <section>
                    <h3 className="px-2 mb-2 text-xs font-bold text-text-secondary uppercase tracking-wider">分帳</h3>
                    <div className="bg-white rounded-[20px] overflow-hidden border border-gray-200">
                        <Link to="/settings/companions">
                            <SettingItem icon={User} label="常用旅伴" value={settings.frequentCompanions?.length ? `${settings.frequentCompanions.length} 位` : undefined} />
                        </Link>
                    </div>
                </section>

                <section>
                    <h3 className="px-2 mb-2 text-xs font-bold text-text-secondary uppercase tracking-wider">關於 Nori</h3>
                    <div className="bg-white rounded-[20px] overflow-hidden border border-gray-200">
                        <SettingItem icon={HelpCircle} label="意見回饋" />
                        <SettingItem icon={Shield} label="隱私權政策" />
                        <div className="p-4 flex justify-between items-center text-sm font-medium text-text-secondary bg-gray-50/50">
                            <span>版本</span>
                            <span>v1.0.0 (Beta)</span>
                        </div>
                    </div>
                </section>
            </div>

            <button
                onClick={() => navigate('/logout')}
                className="w-full py-4 text-red-500 font-bold bg-red-50 rounded-[20px] flex items-center justify-center gap-2 mt-4 active:scale-95 transition-transform"
            >
                <LogOut size={20} />
                登出帳號
            </button>
        </div>
    );
}

function SettingItem({ icon: Icon, label, value }: { icon: any, label: string, value?: string }) {
    return (
        <button className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left active:bg-gray-100">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary">
                <Icon size={16} />
            </div>
            <span className="font-medium text-text flex-1">{label}</span>
            {value && <span className="text-sm text-text-secondary mr-2">{value}</span>}
            <ChevronRight size={16} className="text-gray-300" />
        </button>
    );
}
