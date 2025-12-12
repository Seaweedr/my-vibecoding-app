import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useStorage } from '../../context/StorageContext';

export function SettingsLanguagePage() {
    const navigate = useNavigate();
    const { settings, updateSettings } = useStorage();
    const currentLang = settings.language || 'zh-TW';

    const languages = [
        { code: 'zh-TW', name: '繁體中文', native: '繁體中文' },
        { code: 'en', name: 'English', native: 'English' },
        { code: 'ja', name: '日本語', native: '日本語' },
    ];

    const handleSelect = (code: any) => {
        updateSettings({ language: code });
        // In a real app, this would trigger i18n context update
    };

    return (
        <div className="min-h-screen bg-bg pb-safe">
            <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-black/5 px-4 h-14 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:bg-black/5 transition-colors">
                    <ArrowLeft size={24} className="text-text" />
                </button>
                <h1 className="font-heading font-bold text-lg text-text">語言設定</h1>
            </header>

            <main className="p-4 space-y-4">
                <div className="bg-surface rounded-[24px] overflow-hidden shadow-sm">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleSelect(lang.code)}
                            className="w-full flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors active:bg-gray-100"
                        >
                            <div className="text-left">
                                <div className="font-bold text-text">{lang.native}</div>
                                <div className="text-xs text-text-secondary">{lang.name}</div>
                            </div>
                            {currentLang === lang.code && (
                                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center animate-in zoom-in spin-in-180 duration-300">
                                    <Check size={14} strokeWidth={3} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
}
