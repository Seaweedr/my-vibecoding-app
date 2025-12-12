
import type { CurrencyCode } from '../types';

// Base currency is TWD for these rates
// Rates as of late 2025 (Approximation)
export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
    'TWD': 1,
    'USD': 32.5,
    'JPY': 0.215, // 1 JPY = 0.215 TWD
    'EUR': 35.2,
    'GBP': 41.5,
    'AUD': 21.8,
    'CAD': 23.5,
    'CHF': 37.0,
    'CNY': 4.5,
    'KRW': 0.024, // 1 KRW = 0.024 TWD
    'HKD': 4.15,
    'SGD': 24.2,
    'THB': 0.95,
};

export const COUNTRY_CURRENCY_MAP: Record<string, CurrencyCode> = {
    '日本': 'JPY', 'Japan': 'JPY', 'JP': 'JPY',
    '美國': 'USD', 'USA': 'USD', 'United States': 'USD', 'US': 'USD',
    '台灣': 'TWD', 'Taiwan': 'TWD', 'TW': 'TWD',
    '韓國': 'KRW', 'Korea': 'KRW', 'South Korea': 'KRW', 'KR': 'KRW',
    '英國': 'GBP', 'UK': 'GBP', 'United Kingdom': 'GBP',
    '歐洲': 'EUR', 'Europe': 'EUR', 'France': 'EUR', 'Germany': 'EUR', 'Italy': 'EUR', 'Spain': 'EUR',
    '澳洲': 'AUD', 'Australia': 'AUD', 'AU': 'AUD',
    '加拿大': 'CAD', 'Canada': 'CAD', 'CA': 'CAD',
    '瑞士': 'CHF', 'Switzerland': 'CHF', 'CH': 'CHF',
    '中國': 'CNY', 'China': 'CNY', 'CN': 'CNY',
    '香港': 'HKD', 'Hong Kong': 'HKD', 'HK': 'HKD',
    '新加坡': 'SGD', 'Singapore': 'SGD', 'SG': 'SGD',
    '泰國': 'THB', 'Thailand': 'THB', 'TH': 'THB',
};

export function getCurrencyForCountry(country: string): CurrencyCode | null {
    if (!country) return null;

    // Normalize input
    const normalized = country.trim();

    // Direct match
    if (COUNTRY_CURRENCY_MAP[normalized]) {
        return COUNTRY_CURRENCY_MAP[normalized];
    }

    // Fuzzy match / Keyword match
    for (const key in COUNTRY_CURRENCY_MAP) {
        if (normalized.includes(key)) {
            return COUNTRY_CURRENCY_MAP[key];
        }
    }

    return null;
}

export function convertCurrency(amount: number, from: CurrencyCode, to: CurrencyCode): number {
    if (from === to) return amount;

    const fromRate = EXCHANGE_RATES[from];
    const toRate = EXCHANGE_RATES[to];

    if (!fromRate || !toRate) {
        console.warn(`Missing exchange rate for ${from} or ${to}`);
        return amount; // Fallback
    }

    // Convert to TWD (Base) then to Target
    // Amount in TWD = amount * fromRate
    // Amount in Target = (Amount in TWD) / toRate

    const amountInTWD = amount * fromRate;
    return amountInTWD / toRate;
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: currency === 'JPY' || currency === 'KRW' || currency === 'TWD' ? 0 : 2,
        minimumFractionDigits: 0
    }).format(amount);
}
