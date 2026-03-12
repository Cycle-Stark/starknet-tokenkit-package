import styled from 'styled-components';
import { IToken } from '../types';
import { limitChars } from '../utils';

const TokenListItemContainer = styled.div<{ isselected: boolean; isfocused?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => `${Math.min(theme.borderRadius, 12)}px`};
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
`;

const LogoHolder = styled.div`
  width: 40px;
  height: 40px;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.headerFooterBg};
  overflow: hidden;
`;

const LogoImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: none;
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
  font-size: 14px;
  font-weight: 500;
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

interface ISelectAsset {
  token: IToken;
  select: (token: IToken) => void;
  selectedToken: IToken | null | undefined;
  isFocused?: boolean;
}

const truncateAddress = (address: string) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const TokenListItem = ({ token, select, selectedToken, isFocused }: ISelectAsset) => {

  const selectToken = () => {
    select({ ...token });
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
      <LogoHolder>
        {!token.logo ? (
          <TokenNamePrimary style={{ textTransform: 'uppercase', fontSize: '13px', fontWeight: 600 }}>
            {limitChars(token?.symbol, 2, false)}
          </TokenNamePrimary>
        ) : (
          <LogoImage
            src={token.logo}
            alt={token.symbol}
          />
        )}
      </LogoHolder>
      <TokenContent>
        <NameRow>
          <TokenNamePrimary>{token?.name}</TokenNamePrimary>
          {getBadgeUrl() && (
            <img
              src={getBadgeUrl()?.badge}
              title={getBadgeUrl()?.msg}
              height="14px"
              width="14px"
            />
          )}
        </NameRow>
        <TokenMeta>
          <TokenSymbolSecondary>{token?.symbol}</TokenSymbolSecondary>
          <TokenAddress>{truncateAddress(token?.address)}</TokenAddress>
        </TokenMeta>
      </TokenContent>
    </TokenListItemContainer>
  );
};

export default TokenListItem;