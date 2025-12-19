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

// Advanced image preprocessing for better OCR accuracy
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

            // Optimal sizing for Tesseract (characters should be ~30-40px height)
            let width = img.width;
            let height = img.height;
            const TARGET_WIDTH = 2000;
            const MIN_WIDTH = 1000;

            // Scale up small images
            if (width < MIN_WIDTH) {
                const scale = MIN_WIDTH / width;
                width = MIN_WIDTH;
                height = Math.round(height * scale);
            }
            // Scale down large images
            else if (width > TARGET_WIDTH) {
                height = Math.round((height * TARGET_WIDTH) / width);
                width = TARGET_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw with smoothing disabled for sharper text
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, width, height);

            // Get pixel data
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Step 1: Calculate adaptive threshold using Otsu's method (simplified)
            const histogram = new Array(256).fill(0);
            for (let i = 0; i < data.length; i += 4) {
                const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
                histogram[gray]++;
            }

            // Find optimal threshold
            let sum = 0;
            for (let i = 0; i < 256; i++) sum += i * histogram[i];

            let sumB = 0;
            let wB = 0;
            let wF = 0;
            let maxVariance = 0;
            let threshold = 128;
            const total = width * height;

            for (let t = 0; t < 256; t++) {
                wB += histogram[t];
                if (wB === 0) continue;

                wF = total - wB;
                if (wF === 0) break;

                sumB += t * histogram[t];
                const mB = sumB / wB;
                const mF = (sum - sumB) / wF;
                const variance = wB * wF * (mB - mF) * (mB - mF);

                if (variance > maxVariance) {
                    maxVariance = variance;
                    threshold = t;
                }
            }

            // Adjust threshold for receipts (usually white background)
            threshold = Math.max(threshold, 140);

            // Step 2: Apply adaptive thresholding with noise reduction
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Convert to grayscale
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;

                // Apply threshold with slight smoothing
                let val = gray > threshold ? 255 : 0;

                // Noise reduction: if pixel is very close to threshold, check neighbors
                if (Math.abs(gray - threshold) < 20) {
                    const x = (i / 4) % width;
                    const y = Math.floor((i / 4) / width);
                    let neighborSum = 0;
                    let neighborCount = 0;

                    // Check 3x3 neighborhood
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const ni = ((ny * width) + nx) * 4;
                                const ng = 0.299 * data[ni] + 0.587 * data[ni + 1] + 0.114 * data[ni + 2];
                                neighborSum += ng;
                                neighborCount++;
                            }
                        }
                    }
                    const avgNeighbor = neighborSum / neighborCount;
                    val = avgNeighbor > threshold ? 255 : 0;
                }

                data[i] = val;
                data[i + 1] = val;
                data[i + 2] = val;
            }

            // Step 3: Sharpen text edges
            const sharpened = new Uint8ClampedArray(data);
            const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]; // Sharpening kernel

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4;
                            sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    const idx = (y * width + x) * 4;
                    const val = Math.max(0, Math.min(255, sum));
                    sharpened[idx] = val;
                    sharpened[idx + 1] = val;
                    sharpened[idx + 2] = val;
                }
            }

            imageData.data.set(sharpened);
            ctx.putImageData(imageData, 0, 0);

            // Use PNG for lossless quality
            resolve(canvas.toDataURL('image/png'));
        };

        img.onerror = (err) => {
            console.error("OCR Preprocessing failed", err);
            resolve(imageSrc);
        };
    });
};

export const scanReceipt = async (imageSrc: string): Promise<ScanResult> => {
    try {
        console.log("Starting enhanced OCR...");
        const processedImage = await preprocessImage(imageSrc);

        // Enhanced Tesseract configuration with CJK support
        const { data: { text, confidence } } = await Tesseract.recognize(
            processedImage,
            'eng+chi_tra+chi_sim+jpn+kor',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
                    }
                }
            }
        );

        console.log("Raw OCR Text:", text);
        console.log("OCR Confidence:", confidence);

        const result = parseReceiptText(text);
        result.confidence = confidence;
        return result;
    } catch (error) {
        console.error("OCR Failed:", error);
        throw error;
    }
};

const parseReceiptText = (text: string): ScanResult => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const apiResult: ScanResult = { items: [], rawText: text };

    // Enhanced keyword lists
    const excludedKeywords = [
        'total', 'subtotal', 'amount', '合計', '小計', '總計', '税', '稅',
        'cash', 'change', 'tax', 'visa', 'mastercard', 'credit', 'debit',
        'thank', 'invoice', 'receipt', 'date', 'time', 'tel', 'phone',
        'address', 'welcome', 'service', 'discount', '找零', '現金', '信用卡',
        'qty', 'quantity', '數量', '数量', 'price', '單價', '单价'
    ];

    const totalKeywords = [
        // English
        'total', 'amount', 'grand', 'due', 'sum', 'balance', 'pay', 'charge', 'total amount',
        // Traditional Chinese
        '合計', '總計', '應付', '金額', '總金額', '發票金額', '總共', '共計', '實付', '應付總額', '現收',
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
        'change', 'balance due', '釣り', '釣銭', '找零', '거스름돈'
    ];

    const currencySymbols: { [key: string]: string } = {
        '$': 'USD', 'USD': 'USD',
        'NT$': 'TWD', 'TWD': 'TWD', 'NT': 'TWD',
        '￥': 'JPY', '¥': 'JPY', '円': 'JPY', 'JPY': 'JPY',
        '₩': 'KRW', 'KRW': 'KRW', '원': 'KRW',
        'RMB': 'CNY', 'CNY': 'CNY', '元': 'CNY'
    };

    let maxAmount = 0;
    let subtotal = 0;
    let changeAmount = 0;
    const amounts: { value: number; isTotalLine: boolean; isSubtotalLine: boolean; isChangeLine: boolean }[] = [];

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
                /(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})日?/,
                /(\d{1,2})[月/-](\d{1,2})[年/-](\d{4})/,
                /(\d{2})[/-](\d{2})[/-](\d{2})/,
                /(令和|平成)\s*(\d+|元)年\s*(\d+)月\s*(\d+)日/
            ];
            for (const pattern of datePatterns) {
                const match = line.match(pattern);
                if (match) {
                    if (match[1] === '令和' || match[1] === '平成') {
                        const era = match[1];
                        const yearStr = match[2];
                        let year = yearStr === '元' ? 1 : parseInt(yearStr);
                        if (era === '令和') year += 2018;
                        else if (era === '平成') year += 1988;
                        apiResult.date = `${year}-${match[3].padStart(2, '0')}-${match[4].padStart(2, '0')}`;
                    } else if (match[1].length === 4) {
                        // YYYY-MM-DD
                        apiResult.date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
                    } else if (match[3].length === 4) {
                        // MM-DD-YYYY
                        apiResult.date = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
                    } else if (match[1].length === 2 && match[2].length === 2 && match[3].length === 2) {
                        // YY-MM-DD
                        const year = parseInt(match[1]) > 50 ? `19${match[1]}` : `20${match[1]}`;
                        apiResult.date = `${year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
                    }
                    break;
                }
            }
        }

        // Enhanced number matching - supports multiple formats:
        // 123, 1,234, 1 234, 123.45, $123, NT$123, ￥123, 123円
        const numberPatterns = [
            /(?:NT\$?|[$￥¥₩])\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)/gi,
            /(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)\s*(?:円|원|元)/gi,
            /(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)(?=\s*$)/g,
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

        // Process each number found
        foundNumbers.forEach((numStr) => {
            // Clean and parse
            const cleaned = numStr.replace(/[NT$￥¥₩円원元,\s]/gi, '');
            const amount = parseFloat(cleaned);

            // Validation
            if (isNaN(amount) || amount <= 0 || amount > 9999999) return;

            // Filter out obviously non-amount numbers (like years)
            if (amount >= 2000 && amount <= 2050 && (line.includes('/') || line.includes('.') || line.includes('-') || line.includes('年'))) {
                return;
            }

            // Determine if this is a total, subtotal, or change line
            const isTotalLine = totalKeywords.some(k => lowerLine.includes(k));
            const isSubtotalLine = subtotalKeywords.some(k => lowerLine.includes(k));
            const isChangeLine = changeKeywords.some(k => lowerLine.includes(k));

            amounts.push({ value: amount, isTotalLine, isSubtotalLine, isChangeLine });

            if (isTotalLine && !isChangeLine) {
                // If we found a total line, prefer it but still validate
                if (!apiResult.total || amount > apiResult.total) {
                    apiResult.total = amount;
                }
            } else if (isSubtotalLine) {
                subtotal = amount;
            } else if (isChangeLine) {
                changeAmount = amount;
            }

            if (amount > maxAmount && !isChangeLine) {
                maxAmount = amount;
            }

            // Extract item if this looks like a product line
            const isExcluded = excludedKeywords.some(k => lowerLine.includes(k));
            if (!isTotalLine && !isSubtotalLine && !isChangeLine && !isExcluded) {
                // Get text before the number
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
        });
    });

    // Smart total detection fallback
    if (!apiResult.total) {
        if (subtotal > 0) {
            // Check if there's a value that matches subtotal + some tax
            const possibleTotals = amounts
                .filter(a => !a.isSubtotalLine && !a.isChangeLine && a.value >= subtotal && a.value <= subtotal * 1.3)
                .sort((a, b) => b.value - a.value);

            if (possibleTotals.length > 0) {
                apiResult.total = possibleTotals[0].value;
            } else {
                apiResult.total = subtotal;
            }
        } else if (maxAmount > 0) {
            // Often the largest number is the total, unless it's the "received" amount or "change"
            // If there's a change amount, the total should be (largest - change) or (second largest)
            if (changeAmount > 0) {
                const nonChangeAmounts = amounts
                    .filter(a => !a.isChangeLine && a.value > changeAmount)
                    .sort((a, b) => b.value - a.value);

                if (nonChangeAmounts.length >= 2) {
                    // One might be "received", one might be "total"
                    // Usually total < received
                    apiResult.total = nonChangeAmounts[1].value;
                } else if (nonChangeAmounts.length === 1) {
                    apiResult.total = nonChangeAmounts[0].value;
                } else {
                    apiResult.total = maxAmount;
                }
            } else {
                apiResult.total = maxAmount;
            }
        } else if (apiResult.items.length > 0) {
            apiResult.total = apiResult.items.reduce((sum, item) => sum + item.amount, 0);
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
