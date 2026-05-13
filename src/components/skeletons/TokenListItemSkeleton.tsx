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
  align-items: center;
  gap: 10px;
  padding: 7px 10px;

  @media (max-width: 480px) {
    gap: 8px;
    padding: 6px 8px;
  }
`;

const Circle = styled(SkeletonPulse)`
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 50%;
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const NameBar = styled(SkeletonPulse)<{ width?: string }>`
  width: ${({ width }) => width || '120px'};
  height: 11px;
  border-radius: 4px;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MetaBar = styled(SkeletonPulse)<{ width?: string }>`
  width: ${({ width }) => width || '50px'};
  height: 9px;
  border-radius: 4px;
`;

const nameWidths = ['120px', '90px', '140px', '100px', '110px', '80px', '130px', '95px', '115px', '105px'];

const TokenListItemSkeleton = ({ index = 0 }: { index?: number }) => (
  <Container>
    <Circle />
    <Content>
      <NameBar width={nameWidths[index % nameWidths.length]} />
      <MetaRow>
        <MetaBar width="40px" />
        <MetaBar width="70px" />
      </MetaRow>
    </Content>
  </Container>
);

export default TokenListItemSkeleton;
