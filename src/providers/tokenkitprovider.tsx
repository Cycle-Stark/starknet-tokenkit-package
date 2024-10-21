import React, { ReactNode, useEffect, useMemo, useState } from 'react'
import { Contract, RpcProvider } from 'starknet'
import { connect, disconnect } from 'starknetkit'
import { TOKEN_KIT_ABI, TOKEN_KIT_CONTRACT_ADDRESS_TESTNET, TOKEN_KIT_CONTRACT_ADDRESS_MAINNET, bigintToLongAddress, bigintToShortStr } from '../configs/utils'
import { IToken } from '../types'
import BigNumber from 'bignumber.js'
import { db } from '../configs/db'
import { TokenKitContext } from './providerUtils'


interface IAppProvider {
    children: ReactNode
    mainnetNodeURL: string
    sepoliaNodeURL: string
    network: 'SN_MAIN' | 'SN_SEPOLIA'
}

const TokenKitProvider = ({ children, mainnetNodeURL, sepoliaNodeURL, network }: IAppProvider) => {

    const [contract, setContract] = useState<null | any>()
    const [connection, setConnection] = useState<null | any>();
    const [account, setAccount] = useState<null | any>();
    const [address, setAddress] = useState<null | any>("");
    const [loading, setLoading] = useState(false)
    const [network_, setNetwork] = useState<any>(network)

    const connectWallet = async () => {
        try {
            // let provider = new RpcProvider({ nodeUrl: sepoliaNodeURL })
            const connection: any = await connect({
                webWalletUrl: "https://web.argent.xyz",
                dappName: "Token Kit",
                modalMode: "canAsk"
            });
            if (connection && connection?.wallet) {
                setConnection(connection);
                setAccount(connection?.wallet?.account);
                setAddress(connection?.wallet?.selectedAddress);

                if (connection?.wallet?.id === 'argentX') {
                    const chainID_FROM_PROVIDER = bigintToShortStr(connection?.wallet?.provider?.provider?.chainId)
                    setNetwork(chainID_FROM_PROVIDER)

                } else {
                    const chainID_FROM_PROVIDER = bigintToShortStr(connection?.wallet?.provider?.chainId)
                    // const readChainIdHexForBraavos = bigintToShortStr(connection?.wallet?.chainId)
                    // const chainID_FROM_WALLET_CONNECTION = readChainIdHexForBraavos === "SN_MAIN" ? "SN_MAIN" : "SN_SEPOLIA"
                    setNetwork(chainID_FROM_PROVIDER)
                }

            }
        } catch (err) {

        }
    };

    const disconnectWallet = async () => {
        await disconnect({ clearLastWallet: true });
        setConnection(null);
        setAccount(null);
        setAddress("");
    };


    const makeContractConnection = () => {
        try {
            if (network_ === 'SN_SEPOLIA') {
                let provider = new RpcProvider({ nodeUrl: sepoliaNodeURL })
                let contract = new Contract(TOKEN_KIT_ABI, TOKEN_KIT_CONTRACT_ADDRESS_TESTNET, provider)

                if (account) {
                    contract = new Contract(TOKEN_KIT_ABI, TOKEN_KIT_CONTRACT_ADDRESS_TESTNET, account)
                }
                setContract(contract)
            }
            else if (network_ === 'SN_MAIN') {
                let provider = new RpcProvider({ nodeUrl: mainnetNodeURL })

                let contract = new Contract(TOKEN_KIT_ABI, TOKEN_KIT_CONTRACT_ADDRESS_MAINNET, provider)

                if (account) {
                    contract = new Contract(TOKEN_KIT_ABI, TOKEN_KIT_CONTRACT_ADDRESS_MAINNET, account)
                }
                setContract(contract)
            }
        } catch (error) {
        }
    }

    const handleConnetDisconnectWalletBtnClick = () => {
        if (!account) {
            connectWallet()
        }
        else {
            disconnectWallet()
        }
    }

    const loadTokens = async (page: number) => {
        try {
            const res = await contract.get_tokens(page);
            return res;
        } catch (error) {
            // throw error; // Rethrow the error to handle it at a higher level if needed
            return []
        }
    };

    const formatToken = (token: any) => {
        const icon = bigintToShortStr(token?.icon)
        const formattedIcon = icon.startsWith('https://') || icon.startsWith('http://')
            ? icon // If it starts with 'https://' or 'http://', return as it is
            : `https://${icon}`;

        const formated_token: IToken = {
            address: bigintToLongAddress(token?.address),
            name: bigintToShortStr(token?.name),
            symbol: bigintToShortStr(token?.symbol),
            decimals: new BigNumber(token?.decimals).toNumber(),
            icon: formattedIcon,
            verified: token?.verified,
            public: token?.public,
            common: token?.common
        }
        return formated_token
    }

    const actualLoadTokens = async (noOfTokens: number) => {
        try {
            setLoading(true)
            // Calculate the number of pages based on 25 items per page
            const totalPages = Math.ceil(noOfTokens / 25);

            // Use Promise.all to parallelize fetching token data for all pages
            const allTokens = await Promise.all(
                Array.from({ length: totalPages }, (_, index) => loadTokens(index + 1))
            );

            // Combine the arrays of tokens from different pages if needed
            const combinedTokens = allTokens.flat().map((token: IToken, i: number) => {
                console.log("Token: ", token)
                const formated_token = formatToken(token)
                return ({
                    id: i + 1,
                    ...formated_token
                })
            });
            if (network_ === 'SN_SEPOLIA') {
                db.tokens.clear()
                db.tokens.bulkPut(combinedTokens,).then((res: any) => {
                }).catch((error: any) => {
                })
            }
            if (network_ === 'SN_MAIN') {
                db.mainnet_tokens.clear()
                db.mainnet_tokens.bulkPut(combinedTokens,).then((res: any) => {
                }).catch((error: any) => {
                })
            }
            setLoading(false)
        }
        catch (error: any) {
        }
    }

    const checkAndReloadTokensForVersion = async () => {
        try {
            if (contract) {

                const totalTokens = await contract.get_tokens_count();
                const totalTokensReadable = new BigNumber(totalTokens).toNumber()

                const tokens_version = await contract.get_tokens_version();
                const readable_tokens_version = new BigNumber(tokens_version).toNumber()

                if (network === 'SN_SEPOLIA') {

                    const info = await db.info.get(1)

                    if (!info) {
                        db.info.put({
                            id: 1,
                            tokens_count: totalTokensReadable,
                            name: 'main',
                            tokens_version: readable_tokens_version
                        })
                        actualLoadTokens(totalTokensReadable)
                    }
                    else {
                        if (info?.tokens_version !== readable_tokens_version) {
                            actualLoadTokens(totalTokensReadable)
                            db.info.put({
                                id: 1,
                                tokens_count: totalTokensReadable,
                                name: 'main',
                                tokens_version: readable_tokens_version
                            })
                        }
                    }
                }
                if (network === 'SN_MAIN') {
                    const mainnet_info = await db.mainnet_info.get(1)

                    if (!mainnet_info) {
                        db.mainnet_info.put({
                            id: 1,
                            tokens_count: totalTokensReadable,
                            name: 'main',
                            tokens_version: readable_tokens_version
                        })
                        actualLoadTokens(totalTokensReadable)
                    }
                    else {
                        if (mainnet_info?.tokens_version !== readable_tokens_version) {
                            actualLoadTokens(totalTokensReadable)
                            db.mainnet_info.put({
                                id: 1,
                                tokens_count: totalTokensReadable,
                                name: 'main',
                                tokens_version: readable_tokens_version
                            })
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching contract tokens information:", error);
        }
    }

    const contextValue = useMemo(() => ({
        contract,
        account,
        address,
        connection,
        network: network_,
        handleConnetDisconnectWalletBtnClick,
        reloadTokensFromContract: () => { },
        loadingTokens: loading,
    }), [account, contract?.address, address, network_, mainnetNodeURL, sepoliaNodeURL]);

    useEffect(() => {
        makeContractConnection()
    }, [network_, mainnetNodeURL, sepoliaNodeURL, account])

    useEffect(() => {
        checkAndReloadTokensForVersion()
    }, [contract?.address, network_, mainnetNodeURL, sepoliaNodeURL, account])

    useEffect(() => {
        connectWallet()
    }, [])

    return (
        <TokenKitContext.Provider value={contextValue}>
            {children}
        </TokenKitContext.Provider>
    )
}

export default TokenKitProvider
