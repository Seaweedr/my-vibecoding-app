import { Outlet, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useStorage } from '../context/StorageContext';
import { useEffect } from 'react';

export function Layout() {
    const { settings } = useStorage();
    const navigate = useNavigate();

    useEffect(() => {
        if (!settings.hasSeenOnboarding) {
            navigate('/onboarding');
        }
    }, [settings.hasSeenOnboarding, navigate]);

    return (
        <div className="max-w-md mx-auto min-h-screen bg-bg relative overflow-hidden flex flex-col">
            <main className="flex-1 pb-20 page-enter">
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
}
