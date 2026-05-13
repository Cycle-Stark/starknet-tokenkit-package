import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { limitChars } from '../utils';

const LogoHolder = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  min-width: ${({ $size }) => $size}px;
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

const Initials = styled.span<{ $size: number }>`
  text-transform: uppercase;
  font-size: ${({ $size }) => Math.max(10, Math.round($size * 0.4))}px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.textColor};
  line-height: 1;
  opacity: 0.85;
`;

interface TokenLogoProps {
  logo?: string | null;
  symbol: string;
  size?: number;
}

const TokenLogo = ({ logo, symbol, size = 32 }: TokenLogoProps) => {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [logo]);

  const showFallback = !logo || errored;

  return (
    <LogoHolder $size={size}>
      {showFallback ? (
        <Initials $size={size}>{limitChars(symbol ?? '', 2, false)}</Initials>
      ) : (
        <LogoImage
          src={logo!}
          alt={symbol}
          onError={() => setErrored(true)}
        />
      )}
    </LogoHolder>
  );
};

export default TokenLogo;
