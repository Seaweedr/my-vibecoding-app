export type CurrencyCode = 'USD' | 'EUR' | 'JPY' | 'GBP' | 'AUD' | 'CAD' | 'CHF' | 'CNY' | 'KRW' | 'TWD' | 'HKD' | 'SGD' | 'THB';

export interface Trip {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    country?: string;
    currency: CurrencyCode;
    companions: string[]; // Simplification: Just storing names for now
    budget?: number; // Total budget in home currency
    coverImage?: string; // URL to cover image
    // Computed helpers could go here if using a class, but we'll stick to PODs
}

export interface Companion {
    id: string;
    tripId: string;
    name: string;
}

export interface ExpenseSplit {
    companionId: string; // 'user' or companion UUID
    amount: number;
}

export type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'shopping' | 'entertainment' | 'other';

export interface ExpenseItem {
    id: string;
    name: string;
    amount: number;
}

export type SplitMode = 'equal' | 'exact' | 'percentage' | 'shares';

export interface Expense {
    id: string;
    tripId: string;
    amount: number;
    currency: CurrencyCode;
    date: Date;
    merchant: string;
    category: ExpenseCategory;
    note?: string;
    paidBy: string; // 'user' or companion UUID. Default 'user'
    splitMode: SplitMode; // How the expense is divided
    splits: ExpenseSplit[]; // List of splits.
    images?: string[]; // URLs for receipt or context photos
    items?: ExpenseItem[]; // Itemized list of products
}

export interface UserSettings {
    homeCurrency: CurrencyCode;
    name: string;
    hasSeenOnboarding?: boolean;
    language?: 'zh-TW' | 'en' | 'ja';
    backupEnabled?: boolean;
    notifications?: {
        dailyReminder: boolean;
        expenseAlert: boolean;
        tripReview: boolean;
    };
    frequentCompanions?: string[]; // List of names
}

export interface AppData {
    trips: Trip[];
    companions: Companion[];
    expenses: Expense[];
    settings: UserSettings;
}
