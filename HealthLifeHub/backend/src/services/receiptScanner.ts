/**
 * receiptScanner.ts
 * Gemini Vision reads a grocery receipt photo and returns all food items
 * so they can be auto-added to the pantry — no manual typing needed.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export interface ReceiptItem {
  name: string;
  estimatedWeightG: number;
  unit: string;
  freshnessScore: number;
  estimatedExpiry: string | null;
}

export async function scanGroceryReceipt(imageBuffer: Buffer): Promise<ReceiptItem[]> {
  const base64 = imageBuffer.toString('base64');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Read this grocery receipt image and extract all food/beverage items purchased.
Ignore non-food items (cleaning products, paper goods, etc).
Return ONLY a valid JSON array, no extra text:
[
  {
    "name": "Chicken Breast",
    "estimatedWeightG": 500,
    "unit": "g",
    "freshnessScore": 95,
    "daysUntilExpiry": 3
  }
]
Rules:
- Use realistic estimated weights (e.g. banana bunch = 400g, milk carton = 1000ml)
- Use "ml" for liquids, "g" for solids
- freshnessScore 0-100 (fresh produce = 90+, packaged goods = 80+)
- daysUntilExpiry: fresh meat = 2-3, produce = 5-10, dairy = 7-14, packaged = 180
- Clean up product names (remove store codes, abbreviations)
- Return empty array [] if no food items found`;

  try {
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType: 'image/jpeg' } },
      prompt,
    ]);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((item: any) => {
      const days = Number(item.daysUntilExpiry) || 14;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);
      return {
        name: String(item.name || 'Unknown item'),
        estimatedWeightG: Number(item.estimatedWeightG) || 200,
        unit: String(item.unit || 'g'),
        freshnessScore: Number(item.freshnessScore) || 85,
        estimatedExpiry: expiry.toISOString(),
      };
    });
  } catch {
    return [];
  }
}
