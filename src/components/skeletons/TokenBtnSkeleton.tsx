import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
`;

const SkeletonPulse = styled.div`
  background: ${({ theme }) => theme.colors.headerFooterBg};
  background-image: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.headerFooterBg} 0%,
    ${({ theme }) => theme.colors.searchBorderColor}40 50%,
    ${({ theme }) => theme.colors.headerFooterBg} 100%
  );
  background-size: 200px 100%;
  background-repeat: no-repeat;
  animation: ${shimmer} 1.2s ease-in-out infinite;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  min-width: 64px;
`;

const Circle = styled(SkeletonPulse)`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const TextBar = styled(SkeletonPulse)`
  width: 32px;
  height: 10px;
  border-radius: 4px;
`;

const TokenBtnSkeleton = () => (
  <Container>
    <Circle />
    <TextBar />
  </Container>
);

export default TokenBtnSkeleton;
