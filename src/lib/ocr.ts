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
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const apiResult: ScanResult = { items: [], rawText: text };

    // Regex patterns
    const priceRegex = /[$¥NT]*\s*([0-9,]+(\.[0-9]{2})?)/;
    const excludedKeywords = ['total', 'amount', '合計', '小計', '總計', 'cash', 'change', 'tax', 'visa', 'mastercard'];

    let maxAmount = 0;

    lines.forEach((line) => {
        // Try to capture price at end of line
        const priceMatch = line.match(/(\d{1,3}(,\d{3})*(\.\d+)?)$/);

        if (priceMatch) {
            const rawNum = priceMatch[0].replace(/,/g, '');
            const amount = parseFloat(rawNum);

            // Filter out unlikely large numbers (like phone numbers, dates, or IDs)
            // Heuristic: Receipt prices are usually clean floats.
            if (!isNaN(amount) && amount > 0 && amount < 1000000) {
                // If the line contains "Total" keywords, it's likely the total
                const lowerLine = line.toLowerCase();
                const isTotalLine = lowerLine.includes('total') || lowerLine.includes('合計') || lowerLine.includes('總計');

                if (isTotalLine) {
                    apiResult.total = amount;
                }

                // If it's the largest number seen so far, keep track (fallback for total)
                if (amount > maxAmount) {
                    maxAmount = amount;
                }

                // Try to extract item name (everything before the price)
                const namePart = line.replace(priceMatch[0], '').trim();
                // Filter out short noise or pure symbols
                if (namePart.length > 2 && !excludedKeywords.some(k => namePart.toLowerCase().includes(k))) {
                    apiResult.items.push({ name: namePart, amount });
                }
            }
        }
    });

    // Fallback: if no explicit Total found, use max amount found (common in receipts)
    if (!apiResult.total && maxAmount > 0) {
        apiResult.total = maxAmount;
    }

    // Attempt to find merchant (usually the first non-empty line)
    if (lines.length > 0) {
        // Skip common header words if found (optional refinement)
        apiResult.merchant = lines[0].substring(0, 20);
    }

    return apiResult;
};
