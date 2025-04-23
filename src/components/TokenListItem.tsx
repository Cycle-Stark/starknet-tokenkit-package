import styled from 'styled-components';
import { IToken } from '../types';
import { limitChars } from '../utils';

const TokenListItemContainer = styled.div<{ isselected: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  background: ${({ isselected, theme }) =>
    isselected ? theme.colors.headerFooterBg : 'transparent'};
  pointer-events: ${({ isselected }) => (isselected ? 'none' : 'all')};

  &:hover {
    background: ${({ theme }) => theme.colors.headerFooterBg};
  }
`;

const LogoHolder = styled.div`
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.headerFooterBg};
`;

const TokenContent = styled.div`
  flex: 1;
  display: flex;
  gap: 6px;
  flex-direction: column;
`;

const SymbolHolder = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const TokenSymbol = styled.p`
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textColor};
`;

const TokenName = styled.p`
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textColor};
  opacity: 0.8;
`;

interface ISelectAsset {
  token: IToken;
  select: (token: IToken) => void;
  selectedToken: IToken | null | undefined;
}

const TokenListItem = ({ token, select, selectedToken }: ISelectAsset) => {

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
      onClick={selectToken}
    >
      <LogoHolder>
        {!token.icon ? (
          <TokenSymbol style={{ textTransform: 'uppercase', fontSize: '12px' }}>
            {limitChars(token?.symbol, 2, false)}
          </TokenSymbol>
        ) : (
          <img
            src={token.icon}
            alt=""
            className="logo"
            style={{
              maxHeight: "80%",
              overflow: "hidden"
            }}
          />
        )}
      </LogoHolder>
      <TokenContent>
        <SymbolHolder>
          <TokenSymbol>{token?.symbol}</TokenSymbol>
          {getBadgeUrl() && (
            <img
              src={getBadgeUrl()?.badge}
              title={getBadgeUrl()?.msg}
              height="14px"
              width="14px"
              style={{
                marginBottom: "10px"
              }}
            />
          )}
        </SymbolHolder>
        <TokenName>{token?.name}</TokenName>
      </TokenContent>
    </TokenListItemContainer>
  );
};

export default TokenListItem;