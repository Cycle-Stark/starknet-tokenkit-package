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

export interface IModalThemeObject {
    r: string
    textColor: string
    headerFooterBg: string
    backgroundColor: string
    fontFamily: string
    searchBackground: string
    searchColor: string
    searchBorderColor: string
    searchFocusBorderColor: string
    primaryColor: string
    [key: string]: string
}

export interface ITokenKitWrapper {
    children: ReactNode
    network: 'SN_MAIN' | 'SN_SEPOLIA'
    mainnetAPIKey: string
    sepoliaAPIKey: string
    themeObject: IModalThemeObject
}

export interface ITokenkitProvider {
    children?: ReactNode
    network: 'SN_MAIN' | 'SN_SEPOLIA' | null
    mainnetAPIKey: string | null
    sepoliaAPIKey: string | null
}



export interface ILoadTokenKit {
    children: ReactNode
    select: any
    token: IToken | undefined | null
}


export { type IModalProps }