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
            image: "/assets/welcome.png"
        },
        {
            title: "共同記帳",
            desc: "輕鬆與好友分攤帳單，再也不用在餐桌上尷尬地算錢。",
            image: "/assets/split.png"
        },
        {
            title: "視覺故事",
            desc: "以時光軸呈現你的旅程，不僅是交易清單，更是精彩回憶。",
            image: "/assets/story.png"
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
        <div className="h-screen bg-white flex flex-col items-center justify-between p-8 relative overflow-hidden">
            {/* Text Content (Top) */}
            <div className="w-full flex flex-col items-center text-center mt-12 animate-slide-down">
                <h1 className="text-4xl font-heading font-extrabold text-gray-900 mb-6">
                    {steps[step].title}
                </h1>
                <p className="text-gray-500 text-xl leading-relaxed max-w-xs">
                    {steps[step].desc}
                </p>

                {/* Dots Indicator - moved here to be with text */}
                <div className="flex gap-2 mt-8 justify-center">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-primary w-8' : 'bg-gray-200 w-2'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Image Illustration (Middle/Bottom) - Expanded to take available space */}
            <div className="flex-1 w-full flex items-center justify-center relative my-8">
                <div className="w-80 h-80 animate-bounce-slow">
                    <img
                        src={steps[step].image}
                        alt={steps[step].title}
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Action Button (Bottom) */}
            <div className="w-full mb-8">
                <button
                    onClick={handleNext}
                    className="w-full py-4 bg-primary text-white font-bold rounded-[20px] shadow-xl shadow-primary/20 active:scale-95 transition-transform flex items-center justify-center gap-2 text-lg"
                >
                    {step === steps.length - 1 ? '開始使用' : '下一步'}
                    {step === steps.length - 1 ? <Check size={24} /> : <ArrowRight size={24} />}
                </button>
            </div>
        </div>
    );
}
