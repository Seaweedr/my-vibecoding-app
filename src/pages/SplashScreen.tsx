import { useEffect, useState } from 'react';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        // Start fade out slightly before unmounting
        const timer = setTimeout(() => {
            setOpacity(0);
            setTimeout(onFinish, 500); // 500ms fade transition
        }, 2000); // 2s duration

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div
            className="fixed inset-0 z-50 bg-primary flex flex-col items-center justify-center transition-opacity duration-500"
            style={{ opacity }}
        >
            <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-500">
                <img
                    src="/assets/nori_logo.png"
                    alt="Nori Logo"
                    className="w-24 h-24 rounded-[24px] shadow-2xl brightness-0 invert"
                />
                <h1 className="text-white text-4xl font-black tracking-tighter">Nori</h1>
                <p className="text-white/60 text-sm font-medium tracking-widest uppercase mt-4">by Seaweed</p>
            </div>
        </div>
    );
}
