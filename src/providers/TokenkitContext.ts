import { createContext, useContext } from 'react';
import { ITokenkitProvider } from '../types';

// Define the initial context value
const initialData: ITokenkitProvider = {
  apiKey: null,
  network: null,
  mainnetEndpoint: null,
  sepoliaEndpoint: null,
  options: { tokensToLoad: 'public' },
  origin: null,
};

// Create the context
export const TokenKitContext = createContext<ITokenkitProvider>(initialData);

// Custom hook to use the context
export const useTokenKitContext = () => {
  const context = useContext(TokenKitContext);
  if (!context) {
    throw new Error('useTokenKitContext must be used within a TokenKitProvider');
  }
  return context;
};