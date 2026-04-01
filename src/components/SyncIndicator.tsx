import { useStorage } from '../context/StorageContext';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export function SyncIndicator() {
    const { isSyncing, lastSyncedAt } = useStorage();

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/50 rounded-full border border-gray-100 backdrop-blur-sm transition-all duration-500">
            <div className="relative">
                {isSyncing ? (
                    <RefreshCw size={12} className="text-accent animate-spin" />
                ) : (
                    <CheckCircle2 size={12} className="text-green-500" />
                )}
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-text leading-none">
                    {isSyncing ? 'Syncing...' : 'Synced'}
                </span>
                {lastSyncedAt && !isSyncing && (
                    <span className="text-[8px] text-text-secondary font-medium">
                        {format(lastSyncedAt, 'HH:mm:ss')}
                    </span>
                )}
            </div>

            {/* Pulsing indicator for active status */}
            {!isSyncing && (
                <div className="flex gap-0.5 ml-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                    <div className="w-1 h-1 bg-green-500/40 rounded-full" />
                </div>
            )}
        </div>
    );
}
