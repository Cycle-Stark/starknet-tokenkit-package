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
}: TokenKitProviderProps) => {
    const contextValue = useMemo(
        () => ({
            apiKey,
            network,
            mainnetEndpoint,
            sepoliaEndpoint,
        }),
        [apiKey, network, mainnetEndpoint, sepoliaEndpoint]
    );

    return (
        <TokenKitContext.Provider value={contextValue}>
            {children}
        </TokenKitContext.Provider>
    );
};

export default TokenKitProvider;