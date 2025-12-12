import { Home, Map, Camera, PieChart, User } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';;

export function BottomNav() {
    const location = useLocation();
    const isCapturePage = location.pathname === '/capture';

    if (isCapturePage) return null;

    const tabs = [
        { name: '首頁', path: '/', icon: Home },
        { name: '旅程', path: '/trips', icon: Map },
        { name: '記錄', path: '/capture', icon: Camera, isPrimary: true },
        { name: '統計', path: '/stats', icon: PieChart },
        { name: '個人', path: '/settings', icon: User },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 w-full bg-surface/90 backdrop-blur-md border-t border-black/5 pb-safe pt-2 px-2 shadow-lg transition-all">
            <div className="flex justify-between items-center max-w-lg mx-auto">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        className={({ isActive }) =>
                            cn(
                                "flex flex-col items-center justify-center w-full h-[60px] transition-all duration-200 active:scale-95",
                                isActive ? "text-primary" : "text-text-secondary hover:text-primary/70",
                                tab.isPrimary && "relative -top-5"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {tab.isPrimary ? (
                                    <div className={cn(
                                        "flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform duration-300",
                                        isActive ? "bg-primary scale-110 shadow-primary/40 ring-4 ring-bg" : "bg-primary text-white scale-100 ring-4 ring-bg"
                                    )}>
                                        <tab.icon size={28} className="text-white" />
                                    </div>
                                ) : (
                                    <>
                                        <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                        <span className="text-[11px] font-medium mt-1">{tab.name}</span>
                                    </>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
