import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorage } from '../context/StorageContext';
import { ArrowRight, Check } from 'lucide-react';

export function OnboardingPage() {
    const { completeOnboarding } = useStorage();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "歡迎來到 Nori",
            desc: "專為旅行設計的記帳 App，將你的花費轉化為珍貴回憶。",
            emoji: "🌊"
        },
        {
            title: "共同記帳",
            desc: "輕鬆與好友分攤帳單，再也不用在餐桌上尷尬地算錢。",
            emoji: "🤝"
        },
        {
            title: "視覺故事",
            desc: "以時光軸呈現你的旅程，不僅是交易清單，更是精彩回憶。",
            emoji: "📸"
        }
    ];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            completeOnboarding();
            navigate('/');
        }
    };

    return (
        <div className="h-screen bg-primary flex flex-col items-center justify-between relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

            {/* Image/Illustration Area (Top) */}
            <div className="flex-1 w-full flex items-center justify-center relative p-8">
                <div className="text-[120px] animate-bounce-slow drop-shadow-2xl">
                    {steps[step].emoji}
                </div>
            </div>

            {/* Content Card (Bottom Sheet style) */}
            <div className="w-full bg-surface rounded-t-[40px] p-8 pb-12 shadow-2xl animate-slide-up min-h-[45%] flex flex-col justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-text mb-4">
                        {steps[step].title}
                    </h1>
                    <p className="text-text-secondary text-lg leading-relaxed">
                        {steps[step].desc}
                    </p>
                </div>

                <div className="flex flex-col gap-8 mt-8">
                    {/* Dots */}
                    <div className="flex gap-2">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-primary w-8' : 'bg-gray-200 w-2'}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className="w-full py-4 bg-primary text-white font-bold rounded-[20px] shadow-xl shadow-primary/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                        {step === steps.length - 1 ? '開始使用' : '下一步'}
                        {step === steps.length - 1 ? <Check size={20} /> : <ArrowRight size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
