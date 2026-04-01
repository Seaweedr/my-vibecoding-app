import Tesseract from 'tesseract.js';

export interface ScanResult {
    items: { name: string; amount: number }[];
    total?: number;
    merchant?: string;
    date?: string;
    currency?: string;
    rawText: string;
    confidence?: number;
}

// Lightweight image preprocessing — only resize + mild contrast boost
// Avoids aggressive binarization that destroys receipt text
const preprocessImage = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = imageSrc;
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(imageSrc);
                return;
            }

            let width = img.width;
            let height = img.height;
            const TARGET_WIDTH = 1500;

            if (width > TARGET_WIDTH) {
                height = Math.round((height * TARGET_WIDTH) / width);
                width = TARGET_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;

            // Mild contrast + brightness boost only — no binarization
            ctx.filter = 'contrast(1.3) brightness(1.1)';
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.92));
        };

        img.onerror = () => {
            resolve(imageSrc);
        };
    });
};

export const scanReceipt = async (imageSrc: string): Promise<ScanResult> => {
    console.log("🔍 開始進行 OCR 文字辨識...");
    const processedImage = await preprocessImage(imageSrc);

    // Try CJK + English first, fallback to English-only if it fails
    const langOptions = ['chi_tra+eng', 'eng'];

    for (const lang of langOptions) {
        try {
            console.log(`📦 嘗試語言包: ${lang}`);
            const { data: { text, confidence } } = await Tesseract.recognize(
                processedImage,
                lang,
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            console.log(`📊 OCR 辨識進度: ${(m.progress * 100).toFixed(0)}%`);
                        }
                    }
                }
            );

            console.log("📝 OCR 原始文字:", text);
            console.log("✅ 辨識信心度:", `${(confidence || 0).toFixed(1)}%`);

            // If confidence is too low and we haven't tried fallback yet, try next
            if (confidence < 10 && lang !== langOptions[langOptions.length - 1]) {
                console.log("⚠️ 信心度太低，嘗試其他語言包...");
                continue;
            }

            const result = parseReceiptText(text);
            result.confidence = confidence;
            return result;
        } catch (error) {
            console.warn(`⚠️ 語言包 ${lang} 失敗:`, error);
            if (lang === langOptions[langOptions.length - 1]) {
                throw error;
            }
        }
    }

    throw new Error('OCR 辨識失敗');
};

const parseReceiptText = (text: string): ScanResult => {
    // Clean text: remove excessive dots and dashes often found in receipts
    const cleanLine = (line: string) => {
        return line
            .replace(/[.]{3,}/g, ' ') // Remove row of dots
            .replace(/[-]{3,}/g, ' ') // Remove row of dashes
            .replace(/[_]{3,}/g, ' ') // Remove row of underscores
            .trim();
    };

    const lines = text.split('\n').map(l => cleanLine(l)).filter(l => l.length > 0);
    const apiResult: ScanResult = { items: [], rawText: text };

    // Enhanced keyword lists
    const excludedKeywords = [
        'total', 'subtotal', 'amount', '合計', '小計', '總計', '税', '稅',
        'cash', 'change', 'tax', 'visa', 'mastercard', 'credit', 'debit',
        'thank', 'invoice', 'receipt', 'date', 'time', 'tel', 'phone',
        'address', 'welcome', 'service', 'discount', '找零', '現金', '信用卡',
        'qty', 'quantity', '數量', '数量', 'price', '單價', '单价', 'wifi', '密碼', '密碥'
    ];

    const totalKeywords = [
        // English
        'total', 'amount', 'grand', 'due', 'sum', 'balance', 'pay', 'charge', 'total amount', 'invoice amount',
        // Traditional Chinese
        '合計', '總計', '應付', '金額', '總金額', '發票金額', '總共', '共計', '實付', '應付總額', '現收', '結帳金額',
        // Simplified Chinese
        '总计', '应付', '总金额', '发票金额', '总共', '共计', '实付', '应付金额', '总额',
        // Japanese
        '合計', '税込み', '税込', '総計', '請求', '総額', 'お預り', 'お買上げ', '支払額', '支払',
        // Korean
        '합계', '총액', '결제금액', '받은금액', '총금액', '납부금액', '결제'
    ];

    const subtotalKeywords = [
        'subtotal', 'sub-total', 'sub total',
        '小計', '小计', '未稅', '未税', '課稅対象', '課税'
    ];

    const changeKeywords = [
        'change', 'balance due', '釣り', '釣銭', '找零', '거스름돈', '找款'
    ];

    const cashKeywords = [
        'cash', '現金', '现金', '現收', '现收', '現入', 'お預り'
    ];

    const currencySymbols: { [key: string]: string } = {
        '$': 'USD', 'USD': 'USD',
        'NT$': 'TWD', 'TWD': 'TWD', 'NT': 'TWD',
        '￥': 'JPY', '¥': 'JPY', '円': 'JPY', 'JPY': 'JPY',
        '₩': 'KRW', 'KRW': 'KRW', '원': 'KRW',
        'RMB': 'CNY', 'CNY': 'CNY', '元': 'CNY',
        'HK$': 'HKD', 'HKD': 'HKD'
    };

    let maxAmount = 0;
    let subtotal = 0;
    let changeAmount = 0;
    let cashAmount = 0;
    const amounts: { value: number; isTotalLine: boolean; isSubtotalLine: boolean; isChangeLine: boolean; isCashLine: boolean }[] = [];

    // Enhanced number extraction with multiple formats
    lines.forEach((line, index) => {
        const lowerLine = line.toLowerCase();

        // Skip header lines (usually first 2-3 lines are merchant info)
        if (index < 2 && !lowerLine.includes('$') && !lowerLine.includes('nt')) {
            if (!apiResult.merchant && line.length > 2 && line.length < 30) {
                // Clean merchant name
                const cleanMerchant = line
                    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '')
                    .trim();
                if (cleanMerchant.length >= 2) {
                    apiResult.merchant = cleanMerchant.substring(0, 25);
                }
            }
            return;
        }

        // Try to find currency
        for (const [symbol, code] of Object.entries(currencySymbols)) {
            if (line.includes(symbol)) {
                apiResult.currency = code;
                break;
            }
        }

        // Try to find date
        if (!apiResult.date) {
            const datePatterns = [
                /(結帳時間|日期|Date|Time)\s*[:：]?\s*(\d{4}[年/-]\d{1,2}[月/-]\d{1,2}日?)/i,
                /(令和|平成)\s*(\d+|元)年\s*(\d+)月\s*(\d+)日/,
                /(\d{4}[年/-]\d{1,2}[月/-]\d{1,2}日?)/,
                /(\d{1,2}[月/-]\d{1,2}[年/-]\d{4})/,
                /(\d{2}[/-]\d{2}[/-]\d{2})/
            ];
            for (const pattern of datePatterns) {
                const match = line.match(pattern);
                if (match) {
                    // Check for Japanese Era
                    const eraMatch = line.match(/(令和|平成)\s*(\d+|元)年\s*(\d+)月\s*(\d+)日/);
                    if (eraMatch) {
                        const era = eraMatch[1];
                        const yearStr = eraMatch[2];
                        let year = yearStr === '元' ? 1 : parseInt(yearStr);
                        if (era === '令和') year += 2018;
                        else if (era === '平成') year += 1988;
                        apiResult.date = `${year}-${eraMatch[3].padStart(2, '0')}-${eraMatch[4].padStart(2, '0')}`;
                    } else {
                        // Regular date matching - use the original match or find the best one
                        const dateOnlyMatch = match[2] || match[1] || match[0];
                        const dateParts = dateOnlyMatch.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/) ||
                            dateOnlyMatch.match(/(\d{1,2})[月/-](\d{1,2})[年/-](\d{4})/) ||
                            dateOnlyMatch.match(/(\d{2})[/-](\d{2})[/-](\d{2})/);

                        if (dateParts) {
                            if (dateParts[1].length === 4) {
                                apiResult.date = `${dateParts[1]}-${dateParts[2].padStart(2, '0')}-${dateParts[3].padStart(2, '0')}`;
                            } else if (dateParts[3].length === 4) {
                                apiResult.date = `${dateParts[3]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
                            } else {
                                const year = parseInt(dateParts[1]) > 50 ? `19${dateParts[1]}` : `20${dateParts[1]}`;
                                apiResult.date = `${year}-${dateParts[2].padStart(2, '0')}-${dateParts[3].padStart(2, '0')}`;
                            }
                        }
                    }
                    break;
                }
            }
        }

        // Try to find merchant name in first 5 lines
        if (!apiResult.merchant && index < 5) {
            const isHeaderInfo = !lowerLine.includes('item') && !lowerLine.includes('收據') && !lowerLine.includes('交易') && line.length > 2;
            if (isHeaderInfo) {
                const cleaned = line.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '').trim();
                if (cleaned.length >= 3 && cleaned.length < 30) {
                    apiResult.merchant = cleaned;
                }
            }
        }

        // 改良的數字匹配 - 支援多種格式:
        // 123, 1,234, 1 234, 123.45, $123, NT$123, ￥123, 123円
        // 也處理 OCR 常見錯誤 (如 O 被辨識為 0, l 被辨識為 1)
        const numberPatterns = [
            // 優先匹配帶貨幣符號的數字 (最可靠)
            /(?:NT\$?|[$￥¥₩])\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)/gi,
            // 數字後接貨幣單位
            /(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)\s*(?:円|원|元)/gi,
            // 行尾的數字 (通常是金額)
            /(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)(?=\s*$)/g,
            // 一般數字 (最後才用)
            /(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)/g
        ];

        let foundNumbers: string[] = [];
        for (const pattern of numberPatterns) {
            const matches = line.match(pattern);
            if (matches && matches.length > 0) {
                foundNumbers = matches;
                break;
            }
        }

        if (foundNumbers.length === 0) return;

        // 處理找到的每個數字
        foundNumbers.forEach((numStr) => {
            // 清理並解析數字
            const cleaned = numStr.replace(/[NT$￥¥₩円원元,\s]/gi, '').trim();
            const amount = parseFloat(cleaned);

            // Validation
            if (isNaN(amount) || amount <= 0 || amount > 9999999) return;

            // Filter out obviously non-amount numbers (like years)
            if (amount >= 2000 && amount <= 2050 && (line.includes('/') || line.includes('.') || line.includes('-') || line.includes('年'))) {
                return;
            }

            // Determine if this is a total, subtotal, change, or cash line
            const isTotalLine = totalKeywords.some(k => lowerLine.includes(k));
            const isSubtotalLine = subtotalKeywords.some(k => lowerLine.includes(k));
            const isChangeLine = changeKeywords.some(k => lowerLine.includes(k));
            const isCashLine = cashKeywords.some(k => lowerLine.includes(k));

            amounts.push({ value: amount, isTotalLine, isSubtotalLine, isChangeLine, isCashLine });

            if (isTotalLine && !isChangeLine && !isCashLine) {
                // If we found a total line, prefer it but still validate
                if (!apiResult.total || amount > apiResult.total) {
                    apiResult.total = amount;
                }
            } else if (isSubtotalLine) {
                subtotal = amount;
            } else if (isChangeLine) {
                changeAmount = amount;
            } else if (isCashLine) {
                cashAmount = amount;
            }

            if (amount > maxAmount && !isChangeLine && !isCashLine) {
                maxAmount = amount;
            }

            // Extract item if this looks like a product line
            const isExcluded = excludedKeywords.some(k => lowerLine.includes(k));
            if (!isTotalLine && !isSubtotalLine && !isChangeLine && !isCashLine && !isExcluded) {
                // For item lines with multiple numbers (e.g. "Item 1.5oz 1 200"),
                // the last number is usually the total for that line.
                const lastNum = foundNumbers[foundNumbers.length - 1];
                if (numStr === lastNum) {
                    const numPosition = line.indexOf(numStr);
                    if (numPosition > 0) {
                        let description = line.substring(0, numPosition).trim();

                        // Clean description
                        description = description
                            .replace(/^[\d\s.*-]+/, '')
                            .replace(/[*×xX]\s*\d+\s*$/, '')
                            .replace(/^[^a-zA-Z\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]+/, '')
                            .replace(/[^a-zA-Z\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]+$/, '')
                            .trim();

                        // Only add if description is meaningful
                        if (description.length >= 2 && description.length <= 50) {
                            // Check if this item already exists (avoid duplicates)
                            const exists = apiResult.items.some(item =>
                                item.name === description && Math.abs(item.amount - amount) < 0.01
                            );

                            if (!exists) {
                                apiResult.items.push({ name: description, amount });
                            }
                        }
                    }
                }
            }
        });
    });

    // Smart total detection fallback
    if (!apiResult.total) {
        // Preference 1: Subtotal exists
        if (subtotal > 0) {
            const possibleTotals = amounts
                .filter(a => !a.isSubtotalLine && !a.isChangeLine && !a.isCashLine && a.value >= subtotal && a.value <= subtotal * 1.5)
                .sort((a, b) => b.value - a.value);

            if (possibleTotals.length > 0) {
                apiResult.total = possibleTotals[0].value;
            } else {
                apiResult.total = subtotal;
            }
        }
        // Preference 2: Cash & Change Logic (Common in TW/JP/KR)
        else if (cashAmount > 0 && changeAmount > 0) {
            apiResult.total = cashAmount - changeAmount;
        }
        // Preference 3: Max amount that isn't Cash or Change
        else if (maxAmount > 0) {
            apiResult.total = maxAmount;
        }
        else if (apiResult.items.length > 0) {
            apiResult.total = apiResult.items.reduce((sum, item) => sum + item.amount, 0);
        }
    }

    // Final Validation: If total is caught as a massive number like a phone number, fallback
    if (apiResult.total && apiResult.total > 1000000) {
        const saferPossibleAmounts = amounts.filter(a => a.value < 100000 && a.value > 0);
        if (saferPossibleAmounts.length > 0) {
            apiResult.total = Math.max(...saferPossibleAmounts.map(a => a.value));
        }
    }

    // Remove items that are equal to or greater than total
    if (apiResult.total) {
        apiResult.items = apiResult.items.filter(item => item.amount < apiResult.total! * 0.95);
    }

    // Sort items by amount (descending)
    apiResult.items.sort((a, b) => b.amount - a.amount);

    return apiResult;
};
