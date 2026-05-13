import { useEffect, useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { IModalProps, IToken } from '../types';
import TokenBtn from './TokenBtn';
import TokenListItem from './TokenListItem';
import useDebounce from '../hooks/useDebounce';
import CloseSvg from './icons/CloseSvg';
import { useTokenKitContext } from '../providers/TokenkitContext';
import SearchSvg from './icons/SearchSvg';
import TokenBtnSkeleton from './skeletons/TokenBtnSkeleton';
import TokenListItemSkeleton from './skeletons/TokenListItemSkeleton';
import { getRecentTokens, saveRecentToken, removeRecentToken, clearAllRecentTokens } from '../utils/recentTokens';

const SelectContainer = styled.div<{ height?: string, width?: string }>`
  width: ${({ width }) => width || '420px'};
  max-width: 96%;
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => `${theme.borderRadius}px`};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin: auto;
  padding: 0;
  box-sizing: border-box;
  height: ${({ height, theme }) => height || theme.height};
  max-height: 95dvh;
  font-family: ${({ theme }) => theme.fonts.fontFamily || `"Geist", "Inter", sans-serif`};
  border: 1px solid ${({ theme }) => theme.colors.searchBorderColor}20;
  outline: none;

  input, button, select, textarea {
    font-family: inherit;
  }

  @media (max-width: 480px) {
    max-width: 100%;
    width: 100%;
    border-radius: ${({ theme }) => `${Math.min(theme.borderRadius, 14)}px`};
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.headerFooterBg};
  height: 52px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.headerFooterBg};
  margin: 0;
  padding: 12px 14px;
  box-sizing: border-box;

  @media (max-width: 480px) {
    height: 48px;
    padding: 10px 12px;
  }
`;

const ModalTitle = styled.h3`
  margin: 0;
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.textColor};
`;

const ModalSubTitle = styled.h4`
  margin: 0;
  padding: 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  box-sizing: border-box;
  color: ${({ theme }) => theme.colors.textColor};
  opacity: 0.5;
`;

const CloseButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.textColor};
  border: none;
  cursor: pointer;
  padding: 0;
  height: 20px;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 1;
  }
`;

const ModalBody = styled.div`
  margin: 0;
  padding: 0;
  height: calc(100% - 52px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  @media (max-width: 480px) {
    height: calc(100% - 48px);
  }
`;

const SearchInputContainer = styled.div`
    height: 52px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    box-sizing: border-box;
    margin: 0;
    background: transparent;

    @media (max-width: 480px) {
      height: 48px;
      padding: 8px 12px;
    }
`

const SearchInputGroup = styled.div`
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    font-size: 13px;
    font-weight: 500;
    background: ${({ theme }) => theme.colors.searchBackground};
    border: 1.5px solid ${({ theme }) => theme.colors.searchBorderColor};
    border-radius: 50px;
    transition: border-color 0.15s ease;
    &:focus-within {
        outline: none;
        border-color: ${({ theme }) => theme.colors.searchFocusBorderColor};
    }
`

const SearchInput = styled.input`
  padding: 8px 2px;
  border: none;
  background: transparent;
  flex: 1;
  font-size: 13px;
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
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 4px 14px 2px;
    box-sizing: border-box;
    overflow: hidden;

    @media (max-width: 480px) {
      padding: 2px 12px 0;
    }
`;

const CommonTokensList = styled.div`
    width: 100%;
    display: flex;
    gap: 2px;
    margin: 0;
    padding: 2px 0 6px;
    box-sizing: border-box;
    overflow-y: hidden;
    overflow-x: auto;

    &::-webkit-scrollbar {
        height: 4px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: ${({ theme }) => theme.colors.placeholderColor}40;
        border-radius: 2px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: ${({ theme }) => theme.colors.placeholderColor};
    }
`;

const Divider = styled.div`
    height: 1px;
    background: ${({ theme }) => theme.colors.searchBorderColor};
    margin: 4px 14px 2px;
    opacity: 0.25;

    @media (max-width: 480px) {
      margin: 2px 12px 0;
    }
`;

const TokenListContainer = styled.div`
    flex: 1;
    overflow-y: auto;
    overflow-y: overlay;
    overflow-x: hidden;
    margin: 0;
    padding: 4px 10px 6px;
    box-sizing: border-box;
    scrollbar-gutter: stable;

    @media (max-width: 480px) {
      padding: 4px 8px 6px;
    }

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: ${({ theme }) => theme.colors.placeholderColor}40;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: ${({ theme }) => theme.colors.placeholderColor};
    }
`;

const Paragraph = styled.p`
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textColor};
  opacity: 0.7;
`;

const TokensNotFound = styled.p`
  text-align: center;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textColor};
  opacity: 0.55;
  margin: 0;
  padding: 8px 0;
  box-sizing: border-box;
`;

const Anchor = styled.a`
    text-align: center;
    color: ${({ theme }) => theme.colors.primaryColor};
    margin: 0;
    padding: 0;
    font-size: 12px;
    font-weight: 500;
    box-sizing: border-box;
    text-decoration: none;

    &:hover{
        text-decoration: underline;
    }
`;


const SectionLabelRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px 2px;
`;

const SectionLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.colors.textColor};
    opacity: 0.45;
`;

const ClearAllButton = styled.button`
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: ${({ theme }) => theme.colors.primaryColor};
    opacity: 0.7;
    padding: 0;
    font-family: inherit;
    transition: opacity 0.15s ease;

    &:hover {
        opacity: 1;
    }
`;

const LoadingSentinel = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px 0;
    min-height: 1px;
`;

const Spinner = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid ${({ theme }) => theme.colors.searchBorderColor};
    border-top-color: ${({ theme }) => theme.colors.primaryColor};
    border-radius: 50%;
    animation: spin 0.6s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const TokenContainerFooter = styled.div`
    height: 48px;
    margin: 0;
    padding: 10px 14px;
    box-sizing: border-box;
    background-color: ${({ theme }) => theme.colors.headerFooterBg};
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 6px;

    @media (max-width: 480px) {
      height: 44px;
      padding: 8px 12px;
    }
`;

const PAGE_SIZE = 50;

const SelectTokenContainer = (props: IModalProps & { closeModal?: () => void }) => {
    const { selectedToken, callBackFunc, closeModal } = props;
    const { network, apiKey, mainnetEndpoint, sepoliaEndpoint, options, origin } = useTokenKitContext();
    const [searchedToken, setSearchedToken] = useState('');
    const debouncedValue = useDebounce(searchedToken, 400);
    const [commonTokens, setCommonTokens] = useState<IToken[]>([]);
    const [allTokens, setAllTokens] = useState<IToken[]>([]);
    const [hasLoadedCommonTokens, setHasLoadedCommonTokens] = useState(false);
    const tokensToLoad = options?.tokensToLoad ?? 'public';
    const enableRecent = options?.enableRecent ?? false;
    const [recentTokens, setRecentTokens] = useState<IToken[]>(
        () => (enableRecent && network) ? getRecentTokens(network) : []
    );

    // Infinite scroll state
    const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const initialLoadTriggered = useRef(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const listContainerRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const getEndpoint = useCallback(() => {
        if (network === 'SN_MAIN') return mainnetEndpoint;
        if (network === 'SN_SEPOLIA') return sepoliaEndpoint;
        return null;
    }, [network, mainnetEndpoint, sepoliaEndpoint]);

    const selectToken = useCallback((token: IToken) => {
        if (enableRecent && network) {
            saveRecentToken(network, token);
            setRecentTokens(getRecentTokens(network));
        }
        setSearchedToken('');
        callBackFunc?.(token);
        closeModal?.();
    }, [enableRecent, network, callBackFunc, closeModal]);

    const handleRemoveRecent = useCallback((address: string) => {
        if (enableRecent && network) {
            removeRecentToken(network, address);
            setRecentTokens(getRecentTokens(network));
        }
    }, [enableRecent, network]);

    const handleClearAllRecent = useCallback(() => {
        if (enableRecent && network) {
            clearAllRecentTokens(network);
        }
        setRecentTokens([]);
    }, [enableRecent, network]);

    const fetchTokens = useCallback(async (url: string, headers: Record<string, string>) => {
        const response = await fetch(url, { method: 'GET', headers });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }, []);

    const loadCommonTokens = useCallback(async () => {
        if (hasLoadedCommonTokens) return;
        try {
            const endpoint = getEndpoint();
            if (!network || !apiKey || !endpoint) {
                throw new Error('Network, API key, or endpoint is not set.');
            }
            const baseUrl = endpoint.startsWith('http') ? endpoint : `https://${endpoint}`;
            const publicParam = tokensToLoad === 'all' ? '' : '&public=true';
            const url = `${baseUrl}/api/tokens/?is_erc20=true&common=true&limit=1000&fields=address,symbol,name,decimals,common,verified,logo${publicParam}`;
            const headers: Record<string, string> = { 'api-key': apiKey, 'Content-Type': 'application/json' };
            if (origin) headers['X-Origin'] = origin;
            const data = await fetchTokens(url, headers);
            setCommonTokens(data?.results ?? []);
            setHasLoadedCommonTokens(true);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("Error loading common tokens:", msg);
            setHasLoadedCommonTokens(true);
        }
    }, [hasLoadedCommonTokens, network, apiKey, getEndpoint, fetchTokens, tokensToLoad, origin]);

    // Load a page of all tokens (initial or next)
    const loadTokenPage = useCallback(async (pageUrl?: string) => {
        try {
            const endpoint = getEndpoint();
            if (!network || !apiKey || !endpoint) {
                throw new Error('Network, API key, or endpoint is not set.');
            }

            const headers: Record<string, string> = { 'api-key': apiKey, 'Content-Type': 'application/json' };
            if (origin) headers['X-Origin'] = origin;

            let url: string;
            if (pageUrl) {
                // Use the next page URL from the API, but ensure correct protocol
                url = pageUrl.replace(/^http:/, 'https:');
            } else {
                const baseUrl = endpoint.startsWith('http') ? endpoint : `https://${endpoint}`;
                const publicParam = tokensToLoad === 'all' ? '' : '&public=true';
                url = `${baseUrl}/api/tokens/?is_erc20=true&limit=${PAGE_SIZE}&fields=address,symbol,name,decimals,common,verified,logo&search=${debouncedValue}${publicParam}`;
            }

            const data = await fetchTokens(url, headers);

            const newTokens: IToken[] = data?.results ?? [];
            const nextUrl: string | null = data?.links?.next ?? null;

            if (pageUrl) {
                // Appending next page
                setAllTokens(prev => [...prev, ...newTokens]);
            } else {
                // Fresh search / initial load
                setAllTokens(newTokens);
            }

            setNextPageUrl(nextUrl);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            if (error instanceof TypeError && msg.includes("Failed to fetch")) {
                console.error("Network error: Unable to reach API.");
            } else {
                console.error("Error loading tokens:", msg);
            }
        }
    }, [network, apiKey, getEndpoint, debouncedValue, fetchTokens, tokensToLoad, origin]);

    // Load next page (called by intersection observer)
    const loadNextPage = useCallback(async () => {
        if (isLoadingMore || !nextPageUrl) return;
        setIsLoadingMore(true);
        await loadTokenPage(nextPageUrl);
        setIsLoadingMore(false);
    }, [isLoadingMore, nextPageUrl, loadTokenPage]);

    // Load common tokens on mount and when reset
    useEffect(() => {
        loadCommonTokens();
    }, [loadCommonTokens]);

    // Refetch everything when tokensToLoad option changes
    useEffect(() => {
        // Reset common tokens
        setCommonTokens([]);
        setHasLoadedCommonTokens(false);
        // Reset all tokens
        setAllTokens([]);
        setNextPageUrl(null);
        setIsLoadingInitial(true);
        initialLoadTriggered.current = false;
    }, [tokensToLoad]);

    // Reload recent tokens when network or opt-in flag changes
    useEffect(() => {
        if (enableRecent && network) {
            setRecentTokens(getRecentTokens(network));
        } else {
            setRecentTokens([]);
        }
    }, [enableRecent, network]);

    // Reset and load first page when search changes
    useEffect(() => {
        setAllTokens([]);
        setNextPageUrl(null);
        setIsLoadingInitial(true);
        initialLoadTriggered.current = false;
    }, [debouncedValue]);

    // Load initial page
    useEffect(() => {
        if (isLoadingInitial && !initialLoadTriggered.current) {
            initialLoadTriggered.current = true;
            loadTokenPage().finally(() => {
                setIsLoadingInitial(false);
            });
        }
    }, [isLoadingInitial, loadTokenPage]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const sentinel = sentinelRef.current;
        const container = listContainerRef.current;
        if (!sentinel || !container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && nextPageUrl && !isLoadingMore) {
                    loadNextPage();
                }
            },
            {
                root: container,
                rootMargin: '200px',
                threshold: 0,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [nextPageUrl, isLoadingMore, loadNextPage]);

    // Reset focused index when tokens change
    useEffect(() => {
        setFocusedIndex(-1);
    }, [allTokens.length, debouncedValue]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (allTokens.length === 0) return;

        switch (e.key) {
            case 'ArrowDown': {
                e.preventDefault();
                setFocusedIndex(prev => {
                    const next = prev < allTokens.length - 1 ? prev + 1 : prev;
                    // Scroll into view
                    const container = listContainerRef.current;
                    if (container) {
                        const items = container.querySelectorAll('[data-token-item]');
                        items[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                    return next;
                });
                break;
            }
            case 'ArrowUp': {
                e.preventDefault();
                setFocusedIndex(prev => {
                    const next = prev > 0 ? prev - 1 : 0;
                    const container = listContainerRef.current;
                    if (container) {
                        const items = container.querySelectorAll('[data-token-item]');
                        items[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                    return next;
                });
                break;
            }
            case 'Enter': {
                if (focusedIndex >= 0 && focusedIndex < allTokens.length) {
                    e.preventDefault();
                    selectToken(allTokens[focusedIndex]);
                }
                break;
            }
            case 'Escape': {
                closeModal?.();
                break;
            }
        }
    }, [allTokens, focusedIndex, selectToken, closeModal]);

    return (
        <SelectContainer ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown} width={props.modalWidth} height={props.modalHeight}>
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
                        {!hasLoadedCommonTokens ? (
                            Array(5).fill(null).map((_, i) => <TokenBtnSkeleton key={i} />)
                        ) : commonTokens.length === 0 ? (
                            <TokensNotFound>No Common Tokens</TokensNotFound>
                        ) : (
                            commonTokens.map((token) => (
                                <TokenBtn
                                    key={token.address}
                                    token={token}
                                    select={selectToken}
                                    selectedToken={selectedToken}
                                />
                            ))
                        )}
                    </CommonTokensList>
                </CommonTokens>
                <Divider />
                <TokenListContainer ref={listContainerRef}>
                    {isLoadingInitial ? (
                        Array(10).fill(null).map((_, i) => <TokenListItemSkeleton key={i} index={i} />)
                    ) : (
                        <>
                            {enableRecent && recentTokens.length > 0 && !debouncedValue && (
                                <>
                                    <SectionLabelRow>
                                        <SectionLabel>Recent</SectionLabel>
                                        <ClearAllButton onClick={handleClearAllRecent}>Clear all</ClearAllButton>
                                    </SectionLabelRow>
                                    {recentTokens.map((token) => (
                                        <div key={`recent-${token.address}`} data-token-item>
                                            <TokenListItem
                                                token={token}
                                                select={selectToken}
                                                selectedToken={selectedToken}
                                                onRemove={handleRemoveRecent}
                                            />
                                        </div>
                                    ))}
                                    <SectionLabelRow>
                                        <SectionLabel>All Tokens</SectionLabel>
                                    </SectionLabelRow>
                                </>
                            )}
                            {allTokens.map((token, index) => (
                                <div key={token.address} data-token-item>
                                    <TokenListItem
                                        token={token}
                                        select={selectToken}
                                        selectedToken={selectedToken}
                                        isFocused={index === focusedIndex}
                                    />
                                </div>
                            ))}

                            {allTokens.length === 0 && !isLoadingMore && (
                                <>
                                    <TokensNotFound>No tokens found.</TokensNotFound>
                                    <TokensNotFound style={{ marginTop: "10px" }}>
                                        <Anchor href='https://tokenkithq.io/list-token'>List here</Anchor>
                                    </TokensNotFound>
                                </>
                            )}

                            {/* Sentinel element for infinite scroll */}
                            <LoadingSentinel ref={sentinelRef}>
                                {isLoadingMore && <Spinner />}
                            </LoadingSentinel>
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