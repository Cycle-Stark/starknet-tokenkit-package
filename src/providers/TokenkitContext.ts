import { createContext, useContext } from 'react';
import { ITokenkitProvider } from '../types';

// Define the initial context value
const initialData: ITokenkitProvider = {
  sepoliaAPIKey: null,
  mainnetAPIKey: null,
  network: null,
  endpoint: null,
  protocol: "http"
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