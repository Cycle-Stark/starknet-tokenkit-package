import { ReactNode } from "react";

export const animationGroups = {
    slide: { in: 'slide-down', out: 'slide-up' },
    ease: { in: 'ease-slide', out: 'ease-slide-up' },
    bounce: { in: 'bounce-slide', out: 'bounce-slide-up' },
    fade: { in: 'fade-slide', out: 'fade-slide-up' },
};

interface IModalProps {

    selectedToken: IToken | undefined | null
    children?: ReactNode
    callBackFunc: (token: IToken) => void

    modalHeight?: string
    modalWidth?: string
    animation?: 'bounce' | 'slide' | 'ease' | 'fade'
}


export interface IToken {
    address: string
    name: string
    symbol: string
    decimals: number
    logo: string

    verified?: boolean
    public?: boolean
    common?: boolean

    id?: number,
    price?: number | string | null
}

export interface ThemeColors {
    textColor: string;
    headerFooterBg: string;
    background: string;
    primaryColor: string;
    searchBackground: string;
    searchColor: string;
    searchBorderColor: string;
    searchFocusBorderColor: string;
    placeholderColor: string;
}

export interface ThemeFonts {
    fontFamily: string;
}

export interface Theme {
    colors: ThemeColors;
    fonts: ThemeFonts;
    borderRadius: number;
    height: string;
}

export interface TokenKitOptions {
    tokensToLoad?: 'all' | 'public'
    /** Opt in to persisting and displaying a "Recent" tokens section. Default: false. */
    enableRecent?: boolean
}

export interface ITokenKitWrapper {
    children: ReactNode
    network: 'SN_MAIN' | 'SN_SEPOLIA'
    apiKey: string
    mainnetEndpoint: string
    sepoliaEndpoint: string
    themeObject: Theme
    options?: TokenKitOptions
    /** Optional origin header sent with API requests (e.g., 'chrome-extension://my-wallet') */
    origin?: string
}

export interface ITokenkitProvider {
    children?: ReactNode
    network: 'SN_MAIN' | 'SN_SEPOLIA' | null
    apiKey: string | null
    mainnetEndpoint: string | null
    sepoliaEndpoint: string | null
    options?: TokenKitOptions
    /** Optional origin header sent with API requests */
    origin?: string | null
}



export interface ILoadTokenKit {
    children: ReactNode
    select: (token: IToken) => void
    token: IToken | undefined | null
}


export { type IModalProps }