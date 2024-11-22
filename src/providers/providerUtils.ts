import { createContext, useContext } from "react"
import { ITokenkitProvider } from "../types"


const initialData: ITokenkitProvider = {
    sepoliaAPIKey: null,
    mainnetAPIKey: null,
    network: null
}

export const TokenKitContext = createContext(initialData)

export const useTokenKitContext = () => {
    return useContext(TokenKitContext)
}