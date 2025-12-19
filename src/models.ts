
export interface Language {
  code: string;
  name: string;
}

export interface Phrase {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}
