import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppData, Trip, Expense, UserSettings, Companion } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { saveImageToDB } from '../lib/db';

interface StorageContextType {
    trips: Trip[];
    companions: Companion[];
    expenses: Expense[];
    settings: UserSettings;
    activeTripId: string | null;
    setActiveTripId: (id: string | null) => void;
    addTrip: (trip: Omit<Trip, 'id'>, companionNames?: string[]) => void;
    updateTrip: (id: string, updates: Partial<Trip>) => void;
    deleteTrip: (id: string) => void;
    addExpense: (expense: Omit<Expense, 'id'>) => void;
    updateExpense: (id: string, updates: Partial<Expense>) => void;
    deleteExpense: (id: string) => void;
    getTripExpenses: (tripId: string) => Expense[];
    getTripCompanions: (tripId: string) => Companion[];
    addCompanion: (tripId: string, name: string) => void;
    removeCompanion: (companionId: string) => void;
    completeOnboarding: () => void;
    updateSettings: (settings: Partial<UserSettings>) => void;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

const STORAGE_KEY = 'nori_app_data_v2'; // Bump version to force flush/migrate if needed (or just handle missing keys)

const INITIAL_DATA: AppData = {
    trips: [],
    companions: [],
    expenses: [],
    settings: {
        homeCurrency: 'USD',
        name: 'Traveler',
    },
};

export function StorageProvider({ children }: { children: React.ReactNode }) {
    const [data, setData] = useState<AppData>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);

                const safeDate = (d: any): Date => {
                    const date = new Date(d);
                    return isNaN(date.getTime()) ? new Date() : date;
                };

                // Schema Migration logic (basic)
                return {
                    ...INITIAL_DATA, // Default new fields
                    ...parsed,
                    trips: (parsed.trips || []).map((t: any) => ({
                        ...t,
                        startDate: safeDate(t.startDate),
                        endDate: safeDate(t.endDate),
                    })),
                    expenses: (parsed.expenses || []).map((e: any) => ({
                        ...e,
                        date: safeDate(e.date),
                        // Migration: Add new required fields if missing
                        paidBy: e.paidBy || 'user',
                        splits: e.splits || [],
                    })),
                    companions: parsed.companions || [],
                };
            } catch (e) {
                console.error("Failed to parse storage", e);
                return INITIAL_DATA;
            }
        }
        return INITIAL_DATA;
    });

    const [activeTripId, setActiveTripId] = useState<string | null>(null);

    // Migration Effect: Move heavy images from LocalStorage to IndexedDB
    useEffect(() => {
        const migrateImages = async () => {
            let hasChanges = false;
            const migratedExpenses = await Promise.all(data.expenses.map(async (expense) => {
                if (!expense.images || expense.images.length === 0) return expense;

                const newImages = await Promise.all(expense.images.map(async (img) => {
                    // Check if it's a base64 data URL
                    if (img.startsWith('data:image')) {
                        try {
                            const id = await saveImageToDB(img);
                            hasChanges = true;
                            return id;
                        } catch (e) {
                            console.error("Migration failed for image", e);
                            return img; // Keep as is if failed
                        }
                    }
                    return img; // Already an ID or URL
                }));

                return { ...expense, images: newImages };
            }));

            if (hasChanges) {
                console.log("Migrated legacy images to IndexedDB");
                setData(prev => ({ ...prev, expenses: migratedExpenses }));
            }
        };

        // Run migration only once on mount could be better, but checking here is safe enough as key check is fast
        // To avoid infinite loop, we check if we actually have base64 data
        const needsMigration = data.expenses.some(e => e.images?.some(img => img.startsWith('data:image')));
        if (needsMigration) {
            migrateImages();
        }
    }, [data.expenses]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Failed to save to localStorage", e);
            alert("儲存失敗：空間不足。請嘗試刪除一些舊資料。");
        }
    }, [data]);

    const addTrip = (tripData: Omit<Trip, 'id'>, companionNames: string[] = []) => {
        const newTripId = uuidv4();
        const newTrip: Trip = { ...tripData, id: newTripId };

        // Create companion entities
        const newCompanions: Companion[] = companionNames.map(name => ({
            id: uuidv4(),
            tripId: newTripId,
            name
        }));

        // Update frequent companions
        const currentFrequent = data.settings.frequentCompanions || [];
        const newFrequent = [...new Set([...currentFrequent, ...companionNames])];

        setData(prev => ({
            ...prev,
            trips: [newTrip, ...prev.trips],
            companions: [...prev.companions, ...newCompanions],
            settings: {
                ...prev.settings,
                frequentCompanions: newFrequent
            }
        }));
        setActiveTripId(newTripId);
    };

    const deleteTrip = (id: string) => {
        setData(prev => ({
            ...prev,
            trips: prev.trips.filter(t => t.id !== id),
            expenses: prev.expenses.filter(e => e.tripId !== id),
            companions: prev.companions.filter(c => c.tripId !== id)
        }));
        if (activeTripId === id) setActiveTripId(null);
    };

    const addExpense = (expenseData: Omit<Expense, 'id'>) => {
        const newExpense: Expense = { ...expenseData, id: uuidv4() };
        setData(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses] }));
    };

    const deleteExpense = (id: string) => {
        setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
    };

    const updateExpense = (id: string, updates: Partial<Expense>) => {
        setData(prev => ({
            ...prev,
            expenses: prev.expenses.map(e => e.id === id ? { ...e, ...updates } : e)
        }));
    };

    const getTripExpenses = (tripId: string) => {
        return data.expenses
            .filter(e => e.tripId === tripId)
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    };

    const getTripCompanions = (tripId: string) => {
        return data.companions.filter(c => c.tripId === tripId);
    };

    const updateTrip = (id: string, updates: Partial<Trip>) => {
        setData(prev => ({
            ...prev,
            trips: prev.trips.map(t => t.id === id ? { ...t, ...updates } : t)
        }));
    };

    const addCompanion = (tripId: string, name: string) => {
        const newCompanion: Companion = {
            id: uuidv4(),
            tripId,
            name
        };

        // Update frequent companions
        const currentFrequent = data.settings.frequentCompanions || [];
        const newFrequent = currentFrequent.includes(name)
            ? currentFrequent
            : [...currentFrequent, name];

        setData(prev => ({
            ...prev,
            companions: [...prev.companions, newCompanion],
            settings: {
                ...prev.settings,
                frequentCompanions: newFrequent
            }
        }));
    };

    const removeCompanion = (companionId: string) => {
        setData(prev => ({
            ...prev,
            companions: prev.companions.filter(c => c.id !== companionId)
        }));
    };

    const completeOnboarding = () => {
        setData(prev => ({
            ...prev,
            settings: { ...prev.settings, hasSeenOnboarding: true }
        }));
    };

    return (
        <StorageContext.Provider value={{
            trips: data.trips,
            companions: data.companions,
            expenses: data.expenses,
            settings: data.settings,
            activeTripId,
            setActiveTripId,
            addTrip,
            updateTrip,
            deleteTrip,
            addExpense,
            updateExpense,
            deleteExpense,
            getTripExpenses,
            getTripCompanions,
            addCompanion,
            removeCompanion,
            completeOnboarding,
            updateSettings: (newSettings: Partial<UserSettings>) => {
                setData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, ...newSettings }
                }));
            }
        }}>
            {children}
        </StorageContext.Provider>
    );
}

export function useStorage() {
    const context = useContext(StorageContext);
    if (context === undefined) {
        throw new Error('useStorage must be used within a StorageProvider');
    }
    return context;
}
