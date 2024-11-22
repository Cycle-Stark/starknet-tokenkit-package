import React, { useMemo } from 'react'
import { ITokenkitProvider } from '../types'
import { TokenKitContext } from './providerUtils'


const TokenKitProvider = ({ children, sepoliaAPIKey, mainnetAPIKey, network }: ITokenkitProvider) => {


    const contextValue = useMemo(() => ({
        sepoliaAPIKey,
        mainnetAPIKey,
        network
    }), [network]);

    return (
        <TokenKitContext.Provider value={contextValue}>
            {children}
        </TokenKitContext.Provider>
    )
}

export default TokenKitProvider
