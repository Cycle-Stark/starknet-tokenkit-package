import React, { useMemo } from 'react';
import { ITokenkitProvider } from '../types';
import { TokenKitContext } from './TokenkitContext';

interface TokenKitProviderProps extends ITokenkitProvider {
    children: React.ReactNode;
}

const TokenKitProvider = ({
    children,
    apiKey,
    network,
    mainnetEndpoint,
    sepoliaEndpoint,
    options,
}: TokenKitProviderProps) => {
    const contextValue = useMemo(
        () => ({
            apiKey,
            network,
            mainnetEndpoint,
            sepoliaEndpoint,
            options: { tokensToLoad: 'public' as const, ...options },
        }),
        [apiKey, network, mainnetEndpoint, sepoliaEndpoint, options]
    );

    return (
        <TokenKitContext.Provider value={contextValue}>
            {children}
        </TokenKitContext.Provider>
    );
};

export default TokenKitProvider;