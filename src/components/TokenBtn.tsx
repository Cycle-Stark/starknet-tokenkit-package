import styled from 'styled-components';
import { IToken } from '../types';
import { limitChars } from '../utils';


const TokenBtnContainer = styled.div<{ isselected: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    box-sizing: border-box;
    margin: 0;
    border-radius: ${({ theme }) => `${Math.min(theme.borderRadius, 12)}px`};
    cursor: pointer;
    min-width: 64px;
    transition: background 0.15s ease, transform 0.1s ease;

    background: ${({ isselected, theme }) =>
        isselected ? theme.colors.headerFooterBg : 'transparent'};
    pointer-events: ${({ isselected }) => (isselected ? 'none' : 'all')};
    opacity: ${({ isselected }) => (isselected ? 0.6 : 1)};

    &:hover {
        background: ${({ theme }) => theme.colors.headerFooterBg};
        transform: translateY(-1px);
    }

    &:active {
        transform: scale(0.97);
    }
`;

const LogoHolder = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.headerFooterBg};
  overflow: hidden;
  flex-shrink: 0;
`;

const LogoImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: none;
`;

const TokenSymbol = styled.p`
    font-size: 12px;
    font-weight: 500;
    width: fit-content;
    color: ${({ theme }) => theme.colors.textColor};
    box-sizing: border-box;
    margin: 0;
    white-space: nowrap;
    text-align: center;
`;

interface ISelectAsset {
    token: IToken;
    select: (token: IToken) => void;
    selectedToken: IToken | null | undefined;
}

const TokenBtn = ({ token, select, selectedToken }: ISelectAsset) => {

    const selectToken = () => {
        select({ ...token });
    };

    return (
        <TokenBtnContainer
            isselected={token.address === selectedToken?.address}
            onClick={selectToken}
        >
            <LogoHolder>
                {!token.logo ? (
                    <TokenSymbol style={{ textTransform: 'uppercase', fontSize: '13px', fontWeight: 600 }}>
                        {limitChars(token?.symbol, 2, false)}
                    </TokenSymbol>
                ) : (
                    <LogoImage
                        src={token.logo}
                        alt={token.symbol}
                    />
                )}
            </LogoHolder>
            <TokenSymbol>{token?.symbol}</TokenSymbol>
        </TokenBtnContainer>
    );
};

export default TokenBtn;