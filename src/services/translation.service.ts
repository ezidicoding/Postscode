
import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { Language } from '../models';

@Injectable()
export class TranslationService {
  private ai: GoogleGenAI;
  
  // Character mapping for Sorani Arabic script to a custom script
  private readonly soraniArabicToYezidi: { [key: string]: string } = {
      'ئ': '𐺀', 'ا': '𐺀', 'ب': '𐺁', 'پ': '𐺂', 'ت': '𐺕', 'ج': '𐺆', 'چ': '𐺇',
      'ح': '𐺧', 'خ': '𐺊', 'د': '𐺋', 'ر': '𐺍', 'ڕ': '𐺎', 'ز': '𐺏', 'ژ': '𐺐',
      'س': '𐺑', 'ش': '𐺒', 'ع': '𐺗', 'غ': '𐺘', 'ف': '𐺙', 'ڤ': '𐺚', 'ق': '𐺜',
      'ک': '𐺝', 'گ': '𐺟', 'ل': '𐺠', 'ڵ': '𐺰', 'م': '𐺡', 'ن': '𐺢', 'و': '𐺤',
      'ۆ': '𐺥', 'وو': '𐺣', 'ه': '𐺧', 'ە': '𐺦', 'ي': '𐺨', 'ی': '𐺨', 'ێ': '𐺩'
  };

  constructor() {
    // IMPORTANT: The API key is securely managed and injected via environment variables.
    // Do not hardcode or expose the API key in client-side code.
    if (!process.env.API_KEY) {
      console.warn("API_KEY environment variable not set. Translation service will not work.");
      // This will cause an error, which is expected if the key is missing.
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private transformToYezidi(inputText: string): string {
      let transformedText = inputText;
      for (const [arabic, yezidi] of Object.entries(this.soraniArabicToYezidi)) {
          transformedText = transformedText.replace(new RegExp(arabic, 'g'), yezidi);
      }
      return transformedText.replace(/\s+/g, ' ').trim();
  }

  async translate(text: string, sourceLangCode: string, targetLangCode: string, languages: Language[]): Promise<string> {
    if (!process.env.API_KEY) {
        return "خدمة الترجمة غير متاحة حاليا.";
    }

    let textToTranslate = text;
    let apiSourceLang = sourceLangCode;
    let apiTargetLang = targetLangCode;
    
    // Pre-process for Yezidi Kurdish (Sorani based) input
    if (sourceLangCode === 'yz_ckb') {
      apiSourceLang = 'ckb';
      // The prompt assumes the user is typing in standard Arabic/Sorani script.
      // If the user were typing in the Yezidi script, we would need a reverse transform.
    }
    
    // Map special codes to API-compatible codes for the target language
    if (targetLangCode === 'yz_kmr') apiTargetLang = 'kmr';
    if (targetLangCode === 'yz_ckb') apiTargetLang = 'ckb';
    
    const sourceLanguageName = languages.find(l => l.code === sourceLangCode)?.name || sourceLangCode;
    const targetLanguageName = languages.find(l => l.code === targetLangCode)?.name || targetLangCode;

    const prompt = `Translate the following text from ${sourceLanguageName} to ${targetLanguageName}. Provide only the translation, without any additional comments or explanations.\n\nText: "${textToTranslate}"\n\nTranslation:`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let resultText = response.text.trim();
      
      // Post-process for Yezidi Kurdish (Sorani based) output
      if (targetLangCode === 'yz_ckb') {
        return this.transformToYezidi(resultText);
      }
      
      return resultText;

    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw new Error("Failed to get translation from API.");
    }
  }
}
