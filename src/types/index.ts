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
    icon: string

    verified?: boolean
    public?: boolean
    common?: boolean

    id?: number,
    price?: any
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

export interface ITokenKitWrapper {
    children: ReactNode
    network: 'SN_MAIN' | 'SN_SEPOLIA'
    apiKey: string
    mainnetEndpoint: string
    sepoliaEndpoint: string
    themeObject: Theme
}

export interface ITokenkitProvider {
    children?: ReactNode
    network: 'SN_MAIN' | 'SN_SEPOLIA' | null
    apiKey: string | null
    mainnetEndpoint: string | null
    sepoliaEndpoint: string | null
}



export interface ILoadTokenKit {
    children: ReactNode
    select: any
    token: IToken | undefined | null
}


export { type IModalProps }