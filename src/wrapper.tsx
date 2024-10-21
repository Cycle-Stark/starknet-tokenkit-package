import React from 'react'
import { ITokenKitWrapper } from './types';

import TokenKitProvider from './providers/tokenkitprovider';

const TokenKitWrapper = (props: ITokenKitWrapper) => {
    const { children, network, mainnetNodeURL, sepoliaNodeURL, themeObject } = props

    return (
        <TokenKitProvider mainnetNodeURL={mainnetNodeURL} sepoliaNodeURL={sepoliaNodeURL} network={network}>
            <style>
                {`
                :root{
                    --tokenkit-modal-content-height: 95dvh;
                    --tokenkit-text-color: ${themeObject.textColor ?? 'black'};
                    --tokenkit-header-footer-bg: ${themeObject.headerFooterBg ?? 'gray'};
                    --tokenkit-bg-color: ${themeObject.backgroundColor ?? '#fff'};
                    --tokenkit-font-family: ${themeObject.fontFamily ?? 'Helvetica'};
                    --tokenkit-search-bg: ${themeObject.searchBackground ?? 'black'};
                    --tokenkit-search-color: ${themeObject.searchColor ?? 'black'};
                    --tokenkit-search-border-color: ${themeObject.searchBorderColor ?? 'black'};
                    --tokenkit-search-focus-border-color: ${themeObject.searchFocusBorderColor ?? 'black'};
                    --tokenkit-border-radius: ${themeObject.r ?? '20px'};
                    --tokenkit-primary-color: ${themeObject.primaryColor ?? 'blue'};
                }
                `}
            </style>
            {children}
        </TokenKitProvider>
    )
}


export default TokenKitWrapper