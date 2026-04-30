export interface Suggestion {
  original: string;
  correction: string;
  reason: string;
  index: number;
  type?: "stt" | "ortho" | "accord" | "medical";
  confidence?: number;
  alternatives?: string[];
}

export function isDictionaryReady(): boolean { return false; }
export function getDictionaryCount(): number { return 0; }
export async function loadDictionary(): Promise<void> {}
export function checkText(_text: string): Suggestion[] { return []; }
