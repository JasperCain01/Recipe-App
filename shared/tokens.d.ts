export interface IngredientTokens {
  all: string[];
  strict: string[];
}

export declare const STOPWORDS: Set<string>;
export declare function stripQuantities(text: string): string;
export declare function tokenise(text: string): string[];
export declare function stripIngredientNotes(line: string): string;
export declare function stem(word: string): string;
export declare function normTokens(tokens: string[]): Set<string>;
export declare function tokensForIngredientLine(line: string): IngredientTokens;
