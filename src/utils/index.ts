import { BigNumber } from 'bignumber.js'


export function formatNumberInternational(number: number) {
    const DECIMALS = 4
    if (typeof Intl.NumberFormat === 'function') {
        const formatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: DECIMALS, maximumFractionDigits: DECIMALS });
        return formatter.format(number);
    } else {
        console.warn('Intl.NumberFormat is not supported in this browser. Fallback may not provide accurate formatting.');
        return number.toLocaleString('en-US');
    }
}


export function bigintToLongAddress(bigintstr: string) {
    try {
        if (!bigintstr) return ""
        const bn = BigNumber(bigintstr)
        const hex_sentence = `0x` + bn.toString(16)
        return hex_sentence;
    }
    catch (error) {
        return bigintstr
    }
}

export function convertToReadableTokens(tokens: any, decimals: number) {
    if (!tokens || !decimals) return ""
    return new BigNumber(tokens).dividedBy(10 ** decimals).toNumber().toFixed(6)
}

export const removeTrailingZeros = (tokenAddress: string): string => {
    if (tokenAddress.length > 4) {
        const res = '0x' + tokenAddress.substring(2).replace(/^0+/, "");
        return res
    }
    return tokenAddress
};

export function limitChars(str: string, count: number, show_dots: boolean) {
    if (count <= str?.length) {
        return `${str.substring(0, count)} ${show_dots ? '...' : ''}`
    }
    return str
}


export function timeStampToDate(timestamp: number) {
    if (!timestamp) return null
    const timestampInMilliseconds = timestamp * 1000;
    const date = new Date(timestampInMilliseconds);
    return date;
}

