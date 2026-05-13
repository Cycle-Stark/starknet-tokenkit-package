import { IToken } from '../types';

const STORAGE_KEY_PREFIX = 'tokenkit_recent_tokens';
const MAX_RECENT = 6;

const getStorageKey = (network: string): string => `${STORAGE_KEY_PREFIX}_${network}`;

export const getRecentTokens = (network: string): IToken[] => {
    try {
        const stored = localStorage.getItem(getStorageKey(network));
        if (!stored) return [];
        return JSON.parse(stored) as IToken[];
    } catch {
        return [];
    }
};

export const removeRecentToken = (network: string, address: string): void => {
    try {
        const existing = getRecentTokens(network);
        const updated = existing.filter(t => t.address !== address);
        localStorage.setItem(getStorageKey(network), JSON.stringify(updated));
    } catch {
        // localStorage may be unavailable
    }
};

export const clearAllRecentTokens = (network: string): void => {
    try {
        localStorage.removeItem(getStorageKey(network));
    } catch {
        // localStorage may be unavailable
    }
};

export const saveRecentToken = (network: string, token: IToken): void => {
    try {
        const existing = getRecentTokens(network);
        // Remove duplicate by address, then prepend
        const filtered = existing.filter(t => t.address !== token.address);
        const updated = [token, ...filtered].slice(0, MAX_RECENT);
        localStorage.setItem(getStorageKey(network), JSON.stringify(updated));
    } catch {
        // localStorage may be unavailable (SSR, private browsing quota)
    }
};
