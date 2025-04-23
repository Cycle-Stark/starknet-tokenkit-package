import styled from 'styled-components';
import { IToken } from '../types';
import { limitChars } from '../utils';


const TokenBtnContainer = styled.div<{ isselected: boolean }>`
    width: fit-content !important;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    box-sizing: border-box;
    margin: 0;
    border-radius: 8px;
    cursor: pointer;
    height: fit-content;

    background: ${({ isselected, theme }) =>
        isselected ? theme.colors.headerFooterBg : 'transparent'};
    pointer-events: ${({ isselected }) => (isselected ? 'none' : 'all')};

    &:hover {
    background: ${({ theme }) => theme.colors.headerFooterBg};
    }
`;

const LogoHolder = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.headerFooterBg};
`;

const TokenSymbol = styled.p`
    font-size: 14px;
    width: fit-content;
    color: ${({ theme }) => theme.colors.textColor};
    box-sizing: border-box;
    margin: 0;
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
                            border: "none",
                            height: "85%",
                            overflow: "hidden"
                        }}
                    />
                )}
            </LogoHolder>
            <TokenSymbol>{token?.symbol}</TokenSymbol>
        </TokenBtnContainer>
    );
};

export default TokenBtn;