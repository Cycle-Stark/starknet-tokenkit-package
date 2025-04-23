import React, { useMemo } from 'react';
import { ITokenkitProvider } from '../types';
import { TokenKitContext } from './TokenkitContext';

interface TokenKitProviderProps extends ITokenkitProvider {
    children: React.ReactNode;
}

const TokenKitProvider = ({
    children,
    sepoliaAPIKey,
    mainnetAPIKey,
    network,
    protocol,
    endpoint
}: TokenKitProviderProps) => {
    // Memoize the context value to avoid unnecessary re-renders
    const contextValue = useMemo(
        () => ({
            sepoliaAPIKey,
            mainnetAPIKey,
            network,
            protocol,
            endpoint
        }),
        [sepoliaAPIKey, mainnetAPIKey, network]
    );

    return (
        <TokenKitContext.Provider value={contextValue}>
            {children}
        </TokenKitContext.Provider>
    );
};

export default TokenKitProvider;