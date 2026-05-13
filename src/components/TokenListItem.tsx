import styled from 'styled-components';
import { IToken } from '../types';
import TokenLogo from './TokenLogo';

const TokenListItemContainer = styled.div<{ isselected: boolean; isfocused?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: ${({ theme }) => `${Math.min(theme.borderRadius, 10)}px`};
  cursor: pointer;
  transition: background 0.15s ease;
  background: ${({ isselected, isfocused, theme }) =>
    isselected || isfocused ? theme.colors.headerFooterBg : 'transparent'};
  pointer-events: ${({ isselected }) => (isselected ? 'none' : 'all')};
  opacity: ${({ isselected }) => (isselected ? 0.6 : 1)};
  outline: ${({ isfocused, theme }) => isfocused ? `2px solid ${theme.colors.primaryColor}40` : 'none'};
  outline-offset: -2px;

  &:hover {
    background: ${({ theme }) => theme.colors.headerFooterBg};
  }

  @media (max-width: 480px) {
    gap: 8px;
    padding: 6px 8px;
  }
`;

const TokenContent = styled.div`
  flex: 1;
  display: flex;
  gap: 3px;
  flex-direction: column;
  min-width: 0;
`;

const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const TokenNamePrimary = styled.p`
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.textColor};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TokenMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TokenSymbolSecondary = styled.span`
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textColor};
  opacity: 0.55;
  font-weight: 400;
`;

const TokenAddress = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textColor};
  opacity: 0.35;
  font-family: monospace;
  letter-spacing: 0.02em;
`;

const RemoveButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.textColor};
  opacity: 0.4;
  transition: opacity 0.15s ease;
  flex-shrink: 0;

  &:hover {
    opacity: 0.8;
  }
`;

interface ISelectAsset {
  token: IToken;
  select: (token: IToken) => void;
  selectedToken: IToken | null | undefined;
  isFocused?: boolean;
  onRemove?: (address: string) => void;
}

const truncateAddress = (address: string) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const TokenListItem = ({ token, select, selectedToken, isFocused, onRemove }: ISelectAsset) => {

  const selectToken = () => {
    select({ ...token });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(token.address);
  };

  const getBadgeUrl = () => {
    if (token?.verified && token?.common) {
      return {
        badge: 'https://i.postimg.cc/Qx8RZ8qD/verified.png',
        msg: 'Common & Verified',
      };
    } else if (token?.verified && !token?.common) {
      return {
        badge: 'https://i.postimg.cc/d3BpZpwg/casual-life-3d-check-mark-side-view-pink.png',
        msg: 'Verified',
      };
    }
    return null;
  };

  return (
    <TokenListItemContainer
      isselected={token.address === selectedToken?.address}
      isfocused={isFocused}
      onClick={selectToken}
    >
      <TokenLogo logo={token.logo} symbol={token.symbol} size={32} />
      <TokenContent>
        <NameRow>
          <TokenNamePrimary>{token?.name}</TokenNamePrimary>
          {getBadgeUrl() && (
            <img
              src={getBadgeUrl()?.badge}
              title={getBadgeUrl()?.msg}
              height="12px"
              width="12px"
            />
          )}
        </NameRow>
        <TokenMeta>
          <TokenSymbolSecondary>{token?.symbol}</TokenSymbolSecondary>
          <TokenAddress>{truncateAddress(token?.address)}</TokenAddress>
        </TokenMeta>
      </TokenContent>
      {onRemove && (
        <RemoveButton onClick={handleRemove} title="Remove from recent">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </RemoveButton>
      )}
    </TokenListItemContainer>
  );
};

export default TokenListItem;