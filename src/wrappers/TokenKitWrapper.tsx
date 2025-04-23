import { ThemeProvider } from 'styled-components';
import TokenKitProvider from '../providers/TokenKitProvider';
import { ITokenKitWrapper } from '../types';
import { themes } from '../styles/theme';

const TokenKitWrapper = (props: ITokenKitWrapper) => {
  const { children, themeObject } = props;

  const theme = { ...themes.dark, ...themeObject };

  return (
    <TokenKitProvider {...props}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </TokenKitProvider>
  );
};

export default TokenKitWrapper;