import styled from 'styled-components';
import { IToken } from '../types';
import TokenLogo from './TokenLogo';


const TokenBtnContainer = styled.div<{ isselected: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 6px 10px;
    box-sizing: border-box;
    margin: 0;
    border-radius: ${({ theme }) => `${Math.min(theme.borderRadius, 10)}px`};
    cursor: pointer;
    min-width: 56px;
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

    @media (max-width: 480px) {
        padding: 5px 8px;
        min-width: 52px;
        gap: 4px;
    }
`;

const TokenSymbol = styled.p`
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.01em;
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
            <TokenLogo logo={token.logo} symbol={token.symbol} size={28} />
            <TokenSymbol>{token?.symbol}</TokenSymbol>
        </TokenBtnContainer>
    );
};

export default TokenBtn;