import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cloud, RefreshCw } from 'lucide-react';
import { useStorage } from '../../context/StorageContext';
import { format } from 'date-fns';

export function SettingsBackupPage() {
    const navigate = useNavigate();
    const { updateSettings } = useStorage();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastBackup, setLastBackup] = useState<Date | null>(new Date());

    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            setLastBackup(new Date());
            updateSettings({ backupEnabled: true });
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-bg pb-safe">
            <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-black/5 px-4 h-14 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:bg-black/5 transition-colors">
                    <ArrowLeft size={24} className="text-text" />
                </button>
                <h1 className="font-heading font-bold text-lg text-text">備份與同步</h1>
            </header>

            <main className="p-4 space-y-6">
                {/* Status Card */}
                <div className="bg-surface rounded-[24px] p-6 shadow-sm flex flex-col items-center text-center gap-4">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${isSyncing ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-600'}`}>
                        {isSyncing ? (
                            <RefreshCw size={40} className="animate-spin" />
                        ) : (
                            <Cloud size={40} />
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-text">
                            {isSyncing ? '正在同步...' : 'iCloud 同步已開啟'}
                        </h2>
                        <p className="text-sm text-text-secondary mt-1">
                            {lastBackup
                                ? `上次備份：${format(lastBackup, 'yyyy/MM/dd HH:mm')}`
                                : '尚無備份記錄'}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="w-full py-4 bg-primary text-white font-bold rounded-[20px] shadow-deep active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        {isSyncing ? '同步中...' : '立即備份'}
                    </button>

                    <p className="text-xs text-center text-text-secondary px-4 leading-relaxed">
                        Nori 會自動將您的旅程資料加密並備份至您的 iCloud 帳號。更換手機時，只需登入相同的 iCloud 帳號即可自動還原。
                    </p>
                </div>
            </main>
        </div>
    );
}
