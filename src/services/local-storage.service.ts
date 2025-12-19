
import { Injectable } from '@angular/core';
import { Phrase } from '../models';

@Injectable()
export class LocalStorageService {
  private readonly STORAGE_KEY = 'GoTranslate_Saved_Phrases';

  getPhrases(): Phrase[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading from localStorage', e);
      return [];
    }
  }

  savePhrases(phrases: Phrase[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(phrases));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }
}
