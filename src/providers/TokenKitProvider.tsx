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
    origin,
}: TokenKitProviderProps) => {
    const contextValue = useMemo(
        () => ({
            apiKey,
            network,
            mainnetEndpoint,
            sepoliaEndpoint,
            options: { tokensToLoad: 'public' as const, ...options },
            origin: origin ?? null,
        }),
        [apiKey, network, mainnetEndpoint, sepoliaEndpoint, options, origin]
    );

    return (
        <TokenKitContext.Provider value={contextValue}>
            {children}
        </TokenKitContext.Provider>
    );
};

export default TokenKitProvider;