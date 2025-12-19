
import type { CurrencyCode } from '../types';

// Base currency is TWD for these rates
// Default rates (Fallback if API fails)
export let EXCHANGE_RATES: Record<CurrencyCode, number> = {
    'TWD': 1,
    'USD': 32.5,
    'JPY': 0.215,
    'EUR': 35.2,
    'GBP': 41.5,
    'AUD': 21.8,
    'CAD': 23.5,
    'CHF': 37.0,
    'CNY': 4.5,
    'KRW': 0.024,
    'HKD': 4.15,
    'SGD': 24.2,
    'THB': 0.95,
};

const CACHE_KEY = 'nori_exchange_rates';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export async function initExchangeRates() {
    // 1. Try to load from cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { rates, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
            EXCHANGE_RATES = { ...EXCHANGE_RATES, ...rates };
            console.log('Using cached exchange rates');
            return;
        }
    }

    // 2. Fetch from API (Frankfurter API is free and no key needed)
    try {
        // Frankfurter uses EUR as base by default, but we want TWD base
        // Note: TWD might not be supported as base in some free APIs, 
        // let's use USD as common bridge if TWD fails, but Frankfurter supports many.
        const response = await fetch('https://api.frankfurter.app/latest?from=USD');
        const data = await response.json();

        if (data && data.rates) {
            const usdToTwd = 32.5; // We use a baseline for USD/TWD if not in API
            const newRates: any = { 'USD': usdToTwd, 'TWD': 1 };

            // Frankfurter rates are relative to 1 USD
            // So rate X for JPY means 1 USD = X JPY
            // We want 1 JPY = ? TWD -> (1 / X) * 32.5
            Object.entries(data.rates).forEach(([code, rate]: [string, any]) => {
                if (EXCHANGE_RATES[code as CurrencyCode] !== undefined) {
                    newRates[code] = usdToTwd / rate;
                }
            });

            EXCHANGE_RATES = { ...EXCHANGE_RATES, ...newRates };
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                rates: newRates,
                timestamp: Date.now()
            }));
            console.log('Exchange rates updated from API');
        }
    } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
    }
}

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
