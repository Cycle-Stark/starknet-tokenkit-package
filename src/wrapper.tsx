import React from 'react'
import { ITokenKitWrapper } from './types';

import TokenKitProvider from './providers/tokenkitprovider';

const TokenKitWrapper = (props: ITokenKitWrapper) => {
    const { children, network, mainnetAPIKey, sepoliaAPIKey, themeObject } = props
    const {textColor, headerFooterBg, backgroundColor, fontFamily, searchBackground, searchBorderColor, searchColor, searchFocusBorderColor, primaryColor, r, ...rest} = themeObject

    return (
        <TokenKitProvider mainnetAPIKey={mainnetAPIKey} sepoliaAPIKey={sepoliaAPIKey} network={network}>
            <style>
                {`
                :root{
                    --tokenkit-modal-content-height: 95dvh;
                    --tokenkit-text-color: ${textColor ?? 'black'};
                    --tokenkit-header-footer-bg: ${headerFooterBg ?? 'gray'};
                    --tokenkit-bg-color: ${backgroundColor ?? '#fff'};
                    --tokenkit-font-family: ${fontFamily ?? 'Helvetica'};
                    --tokenkit-search-bg: ${searchBackground ?? 'black'};
                    --tokenkit-search-color: ${searchColor ?? 'black'};
                    --tokenkit-search-border-color: ${searchBorderColor ?? 'black'};
                    --tokenkit-search-focus-border-color: ${searchFocusBorderColor ?? 'black'};
                    --tokenkit-border-radius: ${r ?? '20px'};
                    --tokenkit-primary-color: ${primaryColor ?? 'blue'};
                }
                `}
            </style>
            {children}
        </TokenKitProvider>
    )
}


export default TokenKitWrapper