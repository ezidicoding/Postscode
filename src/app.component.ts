
import { ChangeDetectionStrategy, Component, effect, inject, signal, WritableSignal, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from './services/translation.service';
import { LocalStorageService } from './services/local-storage.service';
import { Language, Phrase } from './models';

declare var webkitSpeechRecognition: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  providers: [TranslationService, LocalStorageService],
})
export class AppComponent {
  private translationService = inject(TranslationService);
  private localStorageService = inject(LocalStorageService);

  languages: Language[] = [
      { code: 'yz_kmr', name: 'الكردية الإيزيدية ( كرمانجية )' },
      { code: 'yz_ckb', name: 'الكردية الإيزيدية ( سورگيه )' },
      { code: 'kmr', name: 'الكردية الكرمانجية' },
      { code: 'ckb', name: 'الكردية السورانية' },
      { code: 'ar', name: 'العربية' },
      { code: 'en', name: 'الإنجليزية' },
      { code: 'nl', name: 'الهولندية' },
      { code: 'fr', name: 'الفرنسية' },
      { code: 'de', name: 'الألمانية' },
      { code: 'es', name: 'الإسبانية' },
      { code: 'it', name: 'الإيطالية' },
      { code: 'ja', name: 'اليابانية' },
      { code: 'ko', name: 'الكورية' },
      { code: 'pt', name: 'البرتغالية' },
      { code: 'ru', name: 'الروسية' },
      { code: 'zh-CN', name: 'الصينية (مبسطة)' },
  ];

  sourceLang: WritableSignal<string> = signal('ar');
  targetLang: WritableSignal<string> = signal('yz_ckb');
  sourceText: WritableSignal<string> = signal('');
  translatedText: WritableSignal<string> = signal('');
  status: WritableSignal<string> = signal('');
  isListening: WritableSignal<boolean> = signal(false);
  savedPhrases: WritableSignal<Phrase[]> = signal([]);
  isModalOpen: WritableSignal<boolean> = signal(false);

  private recognition: any;
  private debounceTimer: any;

  isCurrentTranslationSaved: Signal<boolean> = computed(() => {
    const source = this.sourceText().trim();
    const translated = this.translatedText().trim();
    if (!source || !translated) return false;
    return this.savedPhrases().some(p => 
        p.originalText === source &&
        p.translatedText === translated &&
        p.sourceLang === this.sourceLang() &&
        p.targetLang === this.targetLang()
    );
  });
  
  isSourceYezidiCkb: Signal<boolean> = computed(() => this.sourceLang() === 'yz_ckb');

  constructor() {
    this.savedPhrases.set(this.localStorageService.getPhrases());
    this.setupSpeechRecognition();

    effect(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      // Access signals to register them as dependencies
      const text = this.sourceText();
      this.sourceLang(); 
      this.targetLang();
      
      if (text.trim().length > 0) {
        this.debounceTimer = setTimeout(() => this.translateText(), 500);
      } else {
        this.translatedText.set('');
        this.status.set('');
      }
    });
  }
  
  onSourceTextInput(event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.sourceText.set(value);
  }

  onSourceLangChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.sourceLang.set(value);
  }

  onTargetLangChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.targetLang.set(value);
  }

  async translateText(): Promise<void> {
    const text = this.sourceText().trim();
    if (!text) return;

    this.translatedText.set('...');
    this.status.set('جار الترجمة...');

    try {
      let resultText = await this.translationService.translate(
        text,
        this.sourceLang(),
        this.targetLang(),
        this.languages
      );
      this.translatedText.set(resultText);
      this.status.set('');
    } catch (error) {
      console.error('Translation error:', error);
      this.translatedText.set('حدث خطأ');
      this.status.set('فشلت الترجمة');
    }
  }

  swapLanguages(): void {
    const currentSourceLang = this.sourceLang();
    const currentTargetLang = this.targetLang();
    const currentSourceText = this.sourceText();
    const currentTranslatedText = this.translatedText();

    this.sourceLang.set(currentTargetLang);
    this.targetLang.set(currentSourceLang);
    this.sourceText.set(currentTranslatedText);
  }

  async pasteText(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      this.sourceText.update(current => (current.trim() === '' ? '' : current + ' ') + text);
    } catch (error) {
      console.error('Failed to paste:', error);
      this.status.set('فشل لصق النص');
    }
  }
  
  speakText(text: string, langCode: string): void {
    if (!('speechSynthesis' in window)) {
        alert('متصفحك لا يدعم النطق.');
        return;
    }
    if (langCode === 'yz_kmr' || langCode === 'yz_ckb') {
        alert('النطق الصوتي غير متاح حاليًا لهذه اللغة.');
        return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    window.speechSynthesis.speak(utterance);
  }
  
  toggleFavorite(): void {
    const source = this.sourceText().trim();
    const translated = this.translatedText().trim();

    if (!source || !translated || translated === '...') {
      alert('لا يوجد نص صالح لحفظه.');
      return;
    }
    
    if (this.isCurrentTranslationSaved()) {
        this.savedPhrases.update(phrases => 
            phrases.filter(p => !(p.originalText === source && p.translatedText === translated))
        );
    } else {
        const newPhrase: Phrase = {
            id: `_${Math.random().toString(36).substr(2, 9)}`,
            originalText: source,
            translatedText: translated,
            sourceLang: this.sourceLang(),
            targetLang: this.targetLang(),
            timestamp: Date.now()
        };
        this.savedPhrases.update(phrases => [newPhrase, ...phrases]);
    }
    this.localStorageService.savePhrases(this.savedPhrases());
  }
  
  deletePhrase(id: string): void {
    this.savedPhrases.update(phrases => phrases.filter(p => p.id !== id));
    this.localStorageService.savePhrases(this.savedPhrases());
  }

  openModal(): void {
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  private setupSpeechRecognition(): void {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = this.sourceLang();

      this.recognition.onstart = () => {
        this.isListening.set(true);
        this.status.set('استمع...');
      };
      this.recognition.onend = () => {
        this.isListening.set(false);
        if (this.status() === 'استمع...') this.status.set('');
      };
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.status.set('خطأ في التعرف على الصوت');
      };
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.sourceText.update(current => (current.trim() === '' ? '' : current + ' ') + transcript);
      };
    }
  }

  toggleListening(): void {
    if (!this.recognition) {
        alert("ميزة التعرف على الصوت غير مدعومة في هذا المتصفح.");
        return;
    }
    if (this.isListening()) {
      this.recognition.stop();
    } else {
      this.recognition.lang = this.sourceLang();
      this.recognition.start();
    }
  }

  getLangName(code: string): string {
    return this.languages.find(l => l.code === code)?.name || code;
  }
}
