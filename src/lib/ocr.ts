import Tesseract from 'tesseract.js';

export interface ScanResult {
    items: { name: string; amount: number }[]; // Potential itemized list
    total?: number; // Detected total amount
    merchant?: string; // Detected merchant name
    rawText: string;
}

export const scanReceipt = async (imageSrc: string): Promise<ScanResult> => {
    try {
        const { data: { text } } = await Tesseract.recognize(
            imageSrc,
            'eng+chi_tra+jpn', // Support English, Traditional Chinese, and Japanese
            {
                logger: m => console.log(m)
            }
        );

        console.log("Raw OCR Text:", text);

        return parseReceiptText(text);
    } catch (error) {
        console.error("OCR Failed:", error);
        throw error;
    }
};

const parseReceiptText = (text: string): ScanResult => {
    // Basic normalization
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const apiResult: ScanResult = { items: [], rawText: text };

    const excludedKeywords = ['total', 'amount', '合計', '小計', '總計', 'cash', 'change', 'tax', 'visa', 'mastercard', 'thank', 'invoice', 'date', 'time', 'tel', 'phone'];
    const totalKeywords = ['total', 'amount', 'grand', 'due', '合計', '總計', '應付', '金額'];

    let maxAmount = 0;
    const potentialAmounts: number[] = [];

    lines.forEach((line) => {
        const lowerLine = line.toLowerCase();

        // Match numbers that look like prices (e.g., 100, 1,000, 10.50)
        // Avoid things like timestamps (2024-12-16) or phone numbers
        const priceMatch = line.match(/(['$￥¥NTnt\s]*)([\d,]+(\.\d{2})?)/);

        if (priceMatch) {
            // Find the last number in the line usually
            const allNumbers = line.match(/[\d,]+(\.\d{2})?/g);
            if (!allNumbers) return;

            const rawNum = allNumbers[allNumbers.length - 1].replace(/,/g, '');
            const amount = parseFloat(rawNum);

            // Heuristic filters
            if (isNaN(amount) || amount <= 0) return;
            if (amount > 1000000) return; // Unlikely to be a single meal
            // Filter out years e.g. 2024, 2025 if they appear in isolation or context
            const isYear = (amount >= 2020 && amount <= 2030) && (line.includes('/') || line.includes('-') || line.includes('.'));
            if (isYear) return;

            potentialAmounts.push(amount);

            // Check if this line is explicitly a "Total" line
            const isTotalLine = totalKeywords.some(k => lowerLine.includes(k));

            if (isTotalLine) {
                // If multiple numbers, take the largest on this line
                apiResult.total = amount;
            }

            // Keep track of max seen
            if (amount > maxAmount) {
                maxAmount = amount;
            }

            // Potential Item?
            // If it's not a total line, and has text before the number
            if (!isTotalLine && !excludedKeywords.some(k => lowerLine.includes(k))) {
                // Extract description: usually everything before the last number
                const description = line.replace(/[\d,]+(\.\d{2})?.*$/, '').trim();
                // Clean up leading/trailing symbols
                const cleanDesc = description.replace(/^[^a-zA-Z\u4e00-\u9fa5]+|[^a-zA-Z\u4e00-\u9fa5]+$/g, '');

                if (cleanDesc.length >= 2) {
                    apiResult.items.push({ name: cleanDesc, amount });
                }
            }
        }
    });

    // Fallback logic for Total
    if (!apiResult.total) {
        // 1. Look for the largest number found (assumed to be Total)
        if (maxAmount > 0) {
            apiResult.total = maxAmount;
        } else if (apiResult.items.length > 0) {
            // 2. Or sum of items (if OCR picked up items but missed distinct total line)
            const sum = apiResult.items.reduce((a, b) => a + b.amount, 0);
            apiResult.total = sum;
        }
    }

    // Attempt merchant name (Header heuristic)
    if (lines.length > 0) {
        // Usually line 0 or 1. Skip if it's "Receipt" or "Welcome"
        const potentialMerchant = lines[0].length < 3 ? lines[1] : lines[0];
        if (potentialMerchant && potentialMerchant.length > 1) {
            apiResult.merchant = potentialMerchant.substring(0, 20);
        }
    }

    return apiResult;
};
