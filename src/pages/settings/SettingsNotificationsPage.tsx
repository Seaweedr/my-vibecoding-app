import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, DollarSign, Calendar } from 'lucide-react';
import { useStorage } from '../../context/StorageContext';

export function SettingsNotificationsPage() {
    const navigate = useNavigate();
    const { settings, updateSettings } = useStorage();

    const notifications = settings.notifications || {
        dailyReminder: true,
        expenseAlert: false,
        tripReview: true
    };

    const toggle = (key: keyof typeof notifications) => {
        updateSettings({
            notifications: {
                ...notifications,
                [key]: !notifications[key]
            }
        });
    };

    return (
        <div className="min-h-screen bg-bg pb-safe">
            <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-black/5 px-4 h-14 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full active:bg-black/5 transition-colors">
                    <ArrowLeft size={24} className="text-text" />
                </button>
                <h1 className="font-heading font-bold text-lg text-text">通知設定</h1>
            </header>

            <main className="p-4 space-y-4">
                <div className="bg-surface rounded-[24px] overflow-hidden shadow-sm">
                    <SwitchItem
                        icon={Calendar}
                        label="每日記帳提醒"
                        desc="每天晚上 9:00 提醒您記錄今天的花費"
                        checked={notifications.dailyReminder}
                        onChange={() => toggle('dailyReminder')}
                    />
                    <SwitchItem
                        icon={DollarSign}
                        label="匯率波動通知"
                        desc="當關注的貨幣匯率波動超過 0.5% 時通知"
                        checked={notifications.expenseAlert}
                        onChange={() => toggle('expenseAlert')}
                    />
                    <SwitchItem
                        icon={Bell}
                        label="旅程回顧"
                        desc="旅程結束後，自動生成回憶卡片"
                        checked={notifications.tripReview}
                        onChange={() => toggle('tripReview')}
                    />
                </div>
            </main>
        </div>
    );
}

function SwitchItem({ icon: Icon, label, desc, checked, onChange }: any) {
    return (
        <div className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary mt-1">
                    <Icon size={20} />
                </div>
                <div>
                    <div className="font-bold text-text">{label}</div>
                    <div className="text-xs text-text-secondary mt-0.5 max-w-[200px]">{desc}</div>
                </div>
            </div>

            <button
                onClick={onChange}
                className={`w-12 h-7 rounded-full transition-colors relative ${checked ? 'bg-primary' : 'bg-gray-200'}`}
            >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'left-6' : 'left-1'}`} />
            </button>
        </div>
    );
}
