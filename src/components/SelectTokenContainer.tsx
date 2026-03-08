import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { IModalProps, IToken } from '../types';
import TokenBtn from './TokenBtn';
import TokenListItem from './TokenListItem';
import useDebounce from '../hooks/useDebounce';
import CloseSvg from './icons/CloseSvg';
import { useTokenKitContext } from '../providers/TokenkitContext';
import SearchSvg from './icons/SearchSvg';

const SelectContainer = styled.div<{ height?: string, width?: string }>`
  width: ${({ width }) => width || '400px'};
  max-width: 96%;
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => `${theme.borderRadius}px`};
  /* box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); */
  overflow: hidden;
  margin: auto;
  padding: 0;
  box-sizing: border-box;
  height: ${({ height, theme }) => height || theme.height};
  max-height: 95dvh;
  font-family: ${({ theme }) => theme.fonts.fontFamily || `"Inter", "Arial", "Helvetica", sans-serif`};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* padding: 16px; */
  border-bottom: 1px solid ${({ theme }) => theme.colors.headerFooterBg};
  height: 60px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.headerFooterBg};
  margin: 0;
  padding: 16px;
  box-sizing: border-box;
`;

const ModalTitle = styled.h3`
  margin: 0;
  padding: 0;
  font-weight: 500;
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.textColor};
`;

const ModalSubTitle = styled.h4`
  margin: 0;
  padding: 0;
  font-weight: 500;
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.textColor};
`;

const CloseButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textColor};
  border: none;
  cursor: pointer;
  padding: 0;
  height: 20px;
  width: 20px;
`;

const ModalBody = styled.div`
  margin: 0;
  padding: 0;
  height: calc(100% - 60px);
  box-sizing: border-box;
`;

const SearchInputContainer = styled.div`
    height: 60px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    box-sizing: border-box;
    margin: 0;
    background: transparent;
`

const SearchInputGroup = styled.div` 
    width: 100%;   
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4px;
    padding: 0 10px;
    font-size: 14px;
    font-weight: 500;
    background: ${({ theme }) => theme.colors.searchBackground};
    border: 2px solid ${({ theme }) => theme.colors.searchBorderColor};
    border-radius: 50px;
    &:focus-within {
        outline: none;
        border: 2px solid ${({ theme }) => theme.colors.searchFocusBorderColor};
    }
`

const SearchInput = styled.input`
  padding: 10px;
  border: none;
  margin-bottom: 16px;
  background: transparent;
  flex: 1;
  color: ${({ theme }) => theme.colors.searchColor};
  margin: 0;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.searchFocusBorderColor};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.placeholderColor};
  }
`;


const CommonTokens = styled.div`
    height: 100px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 8px 16px;
    box-sizing: border-box;
    overflow-y: hidden;
    overflow-x: hidden;
    /* background-color: ${({ theme }) => theme.colors.headerFooterBg}; */
`;

const CommonTokensList = styled.div`
    width: 100%;
    height: 80px;
    display: flex;
    gap: 8px;
    margin: 0;
    padding: 10px 0;
    box-sizing: border-box;
    overflow-y: hidden;
    overflow-x: auto;

     /* Custom scrollbar for WebKit browsers */
    &::-webkit-scrollbar {
        height: 6px; /* Height of the scrollbar */
    };

    &::-webkit-scrollbar-track {
        background: transparent; /* Transparent track */
    };

    &::-webkit-scrollbar-thumb {
        background: ${({ theme }) => theme.colors.placeholderColor}; /* Color of the scrollbar thumb */
        border-radius: 3px; /* Rounded corners for the thumb */
    };

    &::-webkit-scrollbar-thumb:hover {
        background: ${({ theme }) => theme.colors.placeholderColor}; /* Color of the scrollbar thumb on hover */
    };

     /* Highlight background color on text selection */
     /* &::selection {
        background: red;
        color: white;
    } */

    /* For Firefox */
    /* & *::selection {
        background: red;
        color: white;
    } */
`;

const TokenListContainer = styled.div`
    height: calc(100% - 220px);
    overflow-y: auto;
    overflow-x: hidden;
    margin: 0;
    padding: 16px;
    box-sizing: border-box;

    /* Custom scrollbar for WebKit browsers */
    &::-webkit-scrollbar {
        /* height: 6px;  */
        width: 8px;
    }

    &::-webkit-scrollbar-track {
        background: transparent; /* Transparent track */
    }

    &::-webkit-scrollbar-thumb {
        background: ${({ theme }) => theme.colors.placeholderColor}; /* Color of the scrollbar thumb */
        border-radius: 3px; /* Rounded corners for the thumb */
    }

    &::-webkit-scrollbar-thumb:hover {
        background: ${({ theme }) => theme.colors.placeholderColor}; /* Color of the scrollbar thumb on hover */
    }

    /* Highlight background color on text selection */
    /* &::selection {
        background: red;
        color: white;
    } */

    /* For Firefox */
    /* & *::selection {
        background: red;
        color: white;
    } */
`;

const Paragraph = styled.p`
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textColor};
  opacity: 0.9;
`;

const TokensNotFound = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.textColor};
  margin: 0;
  padding: 0;
  box-sizing: border-box;
`;

const Anchor = styled.a`
    text-align: center;
    color: ${({ theme }) => theme.colors.primaryColor};
    margin: 0;
    padding: 0;
    font-size: 14px;
    box-sizing: border-box;
    text-decoration: none;

    &:hover{
        text-decoration: underline;
    }
`;


const TokenContainerFooter = styled.div`
    height: 60px;
    margin: 0;
    padding: 16px;
    box-sizing: border-box;
    background-color: ${({ theme }) => theme.colors.headerFooterBg};
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 6px;
`;

const SelectTokenContainer = (props: IModalProps & { closeModal?: () => void }) => {
    const { selectedToken, callBackFunc, closeModal } = props;
    const { network, apiKey, mainnetEndpoint, sepoliaEndpoint } = useTokenKitContext();
    const [searchedToken, setSearchedToken] = useState('');
    const debouncedValue = useDebounce(searchedToken, 400);
    const [commonTokens, setCommonTokens] = useState<IToken[]>([]);
    const [allTokens, setAllTokens] = useState<IToken[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const [hasLoadedCommonTokens, setHasLoadedCommonTokens] = useState(false);
    const [hasLoadedAllTokens, setHasLoadedAllTokens] = useState(false);

    const getEndpoint = () => {
        if (network === 'SN_MAIN') return mainnetEndpoint;
        if (network === 'SN_SEPOLIA') return sepoliaEndpoint;
        return null;
    };

    const selectToken = (token: IToken) => {
        callBackFunc?.(token);
        closeModal?.();
    };

    const loadTokens = async (common: boolean, forceReload = false) => {
        if (common) {
            if (hasLoadedCommonTokens && !forceReload) return;
        } else {
            if (hasLoadedAllTokens && !forceReload) return;
        }
        try {
            const endpoint = getEndpoint();
            if (!network || !apiKey || !endpoint) {
                throw new Error('Network, API key, or endpoint is not set.');
            }

            const baseUrl = endpoint.startsWith('http') ? endpoint : `https://${endpoint}`;

            let url = `${baseUrl}/api/listed-tokens?limit=1000&fields=address,symbol,name,decimals,common,verified,icon&search=${debouncedValue}`;

            if (common) {
                url = `${baseUrl}/api/listed-tokens?limit=1000&fields=address,symbol,name,decimals,common,verified,icon&common=true`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'api-key': apiKey,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                setErrorMessage(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (common) {
                setCommonTokens(data?.results ?? []);
                setHasLoadedCommonTokens(true);
            } else {
                setAllTokens(data?.results ?? []);
                setHasLoadedAllTokens(true);
            }
        } catch (error: any) {
            if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
                console.error("Network error: Unable to reach API. Check if the server is running and accessible.");
            } else {
                console.error("Error loading tokens:", error.message);
            }

            setErrorMessage(`Failed to load tokens: ${error.message}`);
        }
    };


    // Load common tokens only once when component mounts
    useEffect(() => {
        loadTokens(true, false);
    }, []);
    
    // Load all tokens when search value changes
    useEffect(() => {
        loadTokens(false, true);
    }, [debouncedValue]);

    return (
        <SelectContainer width={props.modalWidth} height={props.modalHeight}>
            <ModalHeader>
                <ModalTitle>Select Token</ModalTitle>
                <CloseButton onClick={closeModal}>
                    <CloseSvg />
                </CloseButton>
            </ModalHeader>
            <ModalBody>
                <SearchInputContainer>
                    <SearchInputGroup>
                        <CloseButton>
                            <SearchSvg />
                        </CloseButton>
                        <SearchInput
                            type="text"
                            placeholder="Search by Name, Symbol or Address"
                            value={searchedToken}
                            onChange={(e) => setSearchedToken(e.target.value)}
                        />
                    </SearchInputGroup>
                </SearchInputContainer>
                <CommonTokens>
                    <ModalSubTitle>Common Tokens</ModalSubTitle>
                    <CommonTokensList>
                        {
                            commonTokens?.length === 0 ? (
                                <TokensNotFound>No Common Tokens</TokensNotFound>
                            ) : null
                        }
                        {commonTokens?.map((token) => (
                            <TokenBtn
                                key={token.address}
                                token={token}
                                select={selectToken}
                                selectedToken={selectedToken}
                            />
                        ))}
                    </CommonTokensList>
                </CommonTokens>
                <TokenListContainer>
                    {allTokens?.map((token) => (
                        <TokenListItem
                            key={token.address}
                            token={token}
                            select={selectToken}
                            selectedToken={selectedToken}
                        />
                    ))}

                    {
                        errorMessage ? (
                            <TokensNotFound>[{errorMessage}]</TokensNotFound>
                        ) : null
                    }

                    {allTokens.length === 0 && (
                        <>
                            <TokensNotFound>No tokens found.</TokensNotFound>
                            <TokensNotFound style={{ marginTop: "10px" }}>
                                <Anchor href='https://tokenkithq.io/list-token'>List here</Anchor>
                            </TokensNotFound>
                        </>
                    )}
                </TokenListContainer>
                <TokenContainerFooter>
                    <Paragraph>You don't see your token?</Paragraph>
                    <Anchor href='https://tokenkithq.io/list-token'>List here</Anchor>
                </TokenContainerFooter>
            </ModalBody>
        </SelectContainer>
    );
};

export default SelectTokenContainer;