import SelectTokenModal from './components/SelectTokenModal';
import TokenKitWrapper from './wrappers/TokenKitWrapper';
import { ReactNode, useState } from 'react';
import { IToken, Theme } from './types';
import SelectTokenContainer from './components/SelectTokenContainer';
import { themes } from './styles/theme';
import { styled, ThemeProvider } from 'styled-components';


// Styled components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background || '#f5f5f5'};
  color: ${({ theme }) => theme.colors.text || '#000'};
  padding: 20px 10px;
  box-sizing: border-box;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  justify-content: center;
`;

const StyledButton = styled.button<{bg: string, color: string}>`
    padding: 10px 16px;
    font-size: 14px;
    font-weight: bold;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: 0.3s;
    background: ${({ bg }) => bg};  /* Correct usage */
    color: ${({ color }) => color}; /* Correct usage */

    &:hover {
        background: ${({ theme }) => theme.colors.primaryHover || '#0056b3'};
    }
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
`;

const CustomWrapper = ({ children }: { children: ReactNode }) => {
    const [currentTheme, setCurrentTheme] = useState<Theme>(themes.dark);

    return (
        <ThemeProvider theme={currentTheme}>
            <PageContainer>
                <ButtonContainer>
                    <StyledButton bg={themes.dark.colors.background} color={themes.dark.colors.textColor} onClick={() => setCurrentTheme(themes.dark)}>Dark</StyledButton>
                    <StyledButton bg={themes.light.colors.background} color={themes.light.colors.textColor} onClick={() => setCurrentTheme(themes.light)}>Light</StyledButton>
                    <StyledButton bg={themes.blue.colors.background} color={themes.blue.colors.textColor} onClick={() => setCurrentTheme(themes.blue)}>Blue</StyledButton>
                    <StyledButton bg={themes.gradient.colors.background} color={themes.gradient.colors.textColor} onClick={() => setCurrentTheme(themes.gradient)}>Gradient</StyledButton>
                    <StyledButton bg={themes.sunset.colors.background} color={themes.sunset.colors.textColor} onClick={() => setCurrentTheme(themes.sunset)}>Sunset</StyledButton>
                    <StyledButton bg={themes.ocean.colors.background} color={themes.ocean.colors.textColor} onClick={() => setCurrentTheme(themes.ocean)}>Ocean</StyledButton>
                    <StyledButton bg={themes.monochrome.colors.background} color={themes.monochrome.colors.textColor} onClick={() => setCurrentTheme(themes.monochrome)}>Monochrome</StyledButton>
                </ButtonContainer>
                <TokenKitWrapper
                    network="SN_SEPOLIA"
                    mainnetAPIKey="jphx3Z1S.Ex6T1nYZeH7K1CNJgNWvSRCojYewUT9y"
                    sepoliaAPIKey="SxY1EstD.q3Uxe2JErAtnGe0p7DqRdkl7n2V7Wx14"
                    themeObject={currentTheme}
                    protocol="http"
                    endpoint="localhost:8000"
                >
                    {children}
                </TokenKitWrapper>
            </PageContainer>
        </ThemeProvider>
    );
};

const App = () => {
    const [selectedToken, setSelectedToken] = useState<IToken | null>(null);

    return (
        <CustomWrapper>
            <ContentContainer>
                <SelectTokenModal callBackFunc={setSelectedToken} selectedToken={selectedToken} modalHeight='95dvh' modalWidth='450px'>
                    <StyledButton color='white' bg='linear-gradient(40deg, rgb(245, 66, 245) 0%, rgb(64, 38, 64) 36%, rgb(132, 58, 132) 45%, rgba(82, 0, 255, 0.83) 89%)'>Select Token</StyledButton>
                </SelectTokenModal>
                <SelectTokenContainer selectedToken={selectedToken} callBackFunc={setSelectedToken} modalHeight="calc(100dvh - 200px)" />
            </ContentContainer>
        </CustomWrapper>
    );
};

export default App;