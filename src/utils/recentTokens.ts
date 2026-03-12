import { IToken } from '../types';

const STORAGE_KEY = 'tokenkit_recent_tokens';
const MAX_RECENT = 6;

export const getRecentTokens = (): IToken[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored) as IToken[];
    } catch {
        return [];
    }
};

export const saveRecentToken = (token: IToken): void => {
    try {
        const existing = getRecentTokens();
        // Remove duplicate by address, then prepend
        const filtered = existing.filter(t => t.address !== token.address);
        const updated = [token, ...filtered].slice(0, MAX_RECENT);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // localStorage may be unavailable (SSR, private browsing quota)
    }
};
