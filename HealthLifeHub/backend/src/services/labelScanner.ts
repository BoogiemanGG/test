/**
 * labelScanner.ts
 * Gemini Vision reads a nutrition facts label photo and returns exact values.
 * Much more accurate than estimating from food appearance.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export interface LabelResult {
  productName: string;
  servingSize: string;
  servingsPerContainer: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  saturatedFatG: number;
}

export async function scanNutritionLabel(imageBuffer: Buffer): Promise<LabelResult> {
  const base64 = imageBuffer.toString('base64');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Read the nutrition facts label in this image carefully.
Return ONLY a valid JSON object, no extra text:
{
  "productName": "product name if visible on package, or Unknown",
  "servingSize": "serving size text e.g. 1 cup (240ml)",
  "servingsPerContainer": 2,
  "calories": 250,
  "proteinG": 10,
  "carbsG": 35,
  "fatG": 8,
  "fiberG": 3,
  "sugarG": 12,
  "sodiumMg": 580,
  "saturatedFatG": 2
}
All numeric values are for ONE serving. If a value is not on the label, use 0.`;

  try {
    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType: 'image/jpeg' } },
      prompt,
    ]);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      productName: String(parsed.productName || 'Unknown product'),
      servingSize: String(parsed.servingSize || '1 serving'),
      servingsPerContainer: Number(parsed.servingsPerContainer) || 1,
      calories: Number(parsed.calories) || 0,
      proteinG: Number(parsed.proteinG) || 0,
      carbsG: Number(parsed.carbsG) || 0,
      fatG: Number(parsed.fatG) || 0,
      fiberG: Number(parsed.fiberG) || 0,
      sugarG: Number(parsed.sugarG) || 0,
      sodiumMg: Number(parsed.sodiumMg) || 0,
      saturatedFatG: Number(parsed.saturatedFatG) || 0,
    };
  } catch {
    return {
      productName: 'Could not read label',
      servingSize: '1 serving',
      servingsPerContainer: 1,
      calories: 0, proteinG: 0, carbsG: 0, fatG: 0,
      fiberG: 0, sugarG: 0, sodiumMg: 0, saturatedFatG: 0,
    };
  }
}
