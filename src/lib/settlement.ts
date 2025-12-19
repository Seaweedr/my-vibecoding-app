import type { Expense, Companion, CurrencyCode } from '../types';
import { convertCurrency } from './currency';

export interface MemberBalance {
    id: string; // 'user' or companion UUID
    name: string;
    paid: number;
    shouldPay: number;
    net: number; // paid - shouldPay. Positive = Owed, Negative = Owes
}

export interface Settlement {
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    amount: number;
}

export const calculateBalances = (
    expenses: Expense[],
    companions: Companion[],
    targetCurrency: CurrencyCode = 'TWD'
): MemberBalance[] => {
    const balances: Record<string, { paid: number; shouldPay: number; name: string }> = {};

    // Initialize with user
    balances['user'] = { paid: 0, shouldPay: 0, name: '我' };

    // Initialize with companions
    companions.forEach(c => {
        balances[c.id] = { paid: 0, shouldPay: 0, name: c.name };
    });

    // Sum up payments and shares
    expenses.forEach(exp => {
        const amountInTarget = convertCurrency(exp.amount, exp.currency, targetCurrency);

        // Person who paid
        if (balances[exp.paidBy]) {
            balances[exp.paidBy].paid += amountInTarget;
        }

        // Split among involved people
        exp.splits.forEach(split => {
            if (balances[split.companionId]) {
                // We need to convert each individual split amount because they are also in exp.currency
                const splitAmountInTarget = convertCurrency(split.amount, exp.currency, targetCurrency);
                balances[split.companionId].shouldPay += splitAmountInTarget;
            }
        });
    });

    return Object.entries(balances).map(([id, b]) => ({
        id,
        name: b.name,
        paid: b.paid,
        shouldPay: b.shouldPay,
        net: Number((b.paid - b.shouldPay).toFixed(2))
    }));
};

/**
 * Simplifies settlements among members.
 * Algorithm:
 * 1. Find all debtors (net < 0) and creditors (net > 0).
 * 2. Match the largest debtor with the largest creditor.
 * 3. Reduce debt/credit and repeat.
 */
export const calculateSettlements = (
    balances: MemberBalance[]
): Settlement[] => {
    const settlements: Settlement[] = [];

    // Filter and clone to avoid mutating original
    let creditors = balances
        .filter(b => b.net > 0.01)
        .sort((a, b) => b.net - a.net)
        .map(b => ({ ...b }));

    let debtors = balances
        .filter(b => b.net < -0.01)
        .sort((a, b) => a.net - b.net) // Most negative first
        .map(b => ({ ...b, net: Math.abs(b.net) }));

    while (creditors.length > 0 && debtors.length > 0) {
        const creditor = creditors[0];
        const debtor = debtors[0];

        const amount = Math.min(creditor.net, debtor.net);

        if (amount > 0.01) {
            settlements.push({
                fromId: debtor.id,
                fromName: debtor.name,
                toId: creditor.id,
                toName: creditor.name,
                amount: Number(amount.toFixed(2))
            });
        }

        creditor.net -= amount;
        debtor.net -= amount;

        if (creditor.net < 0.01) creditors.shift();
        if (debtor.net < 0.01) debtors.shift();
    }

    return settlements;
};
