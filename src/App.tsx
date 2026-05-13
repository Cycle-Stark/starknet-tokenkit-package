import SelectTokenModal from './components/SelectTokenModal';
import TokenKitWrapper from './wrappers/TokenKitWrapper';
import { ReactNode, useState, useCallback, useMemo } from 'react';
import { IToken, Theme, ThemeColors, TokenKitOptions } from './types';
import SelectTokenContainer from './components/SelectTokenContainer';
import { themes } from './styles/theme';
import styled, { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
`;

// ─── Layout ────────────────────────────────────
const PageContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: #0f0f13;
  color: #e0e0e0;
`;

const Sidebar = styled.aside`
  width: 380px;
  min-width: 380px;
  background: #16161d;
  border-right: 1px solid #2a2a35;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

  @media (max-width: 900px) {
    display: none;
  }
`;

const SidebarHeader = styled.div`
  padding: 24px 20px 16px;
  border-bottom: 1px solid #2a2a35;
`;

const Logo = styled.h1`
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;

  span {
    background: linear-gradient(135deg, #a78bfa, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const SubText = styled.p`
  margin: 0;
  font-size: 12px;
  color: #666;
`;

const SidebarSection = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a35;
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
`;

// ─── Theme Picker ──────────────────────────────
const ThemeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const ThemeCard = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 2px solid ${({ $isActive }) => $isActive ? '#6366f1' : '#2a2a35'};
  background: ${({ $isActive }) => $isActive ? '#1e1e2e' : '#1a1a24'};
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;

  &:hover {
    border-color: ${({ $isActive }) => $isActive ? '#6366f1' : '#444'};
    background: #1e1e2e;
  }
`;

const ThemeSwatch = styled.div<{ $bg: string }>`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${({ $bg }) => $bg};
  border: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
`;

const ThemeCardLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// ─── Custom Theme Builder ──────────────────────
const ColorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
`;

const ColorLabel = styled.label`
  font-size: 12px;
  color: #999;
  flex: 1;
`;

const ColorInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ColorSwatch = styled.input`
  -webkit-appearance: none;
  width: 28px;
  height: 28px;
  border: 1px solid #333;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  padding: 0;

  &::-webkit-color-swatch-wrapper { padding: 2px; }
  &::-webkit-color-swatch { border: none; border-radius: 4px; }
`;

const ColorTextInput = styled.input`
  width: 90px;
  padding: 5px 8px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #1a1a24;
  color: #ccc;
  font-size: 11px;
  font-family: monospace;

  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`;

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
`;

const SliderLabel = styled.label`
  font-size: 12px;
  color: #999;
  min-width: 100px;
`;

const Slider = styled.input`
  flex: 1;
  margin: 0 8px;
  accent-color: #6366f1;
`;

const SliderValue = styled.span`
  font-size: 11px;
  color: #666;
  font-family: monospace;
  min-width: 36px;
  text-align: right;
`;

// ─── Copy / Actions ────────────────────────────
const ActionBar = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'default' }>`
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $variant }) => $variant === 'primary' ? '#6366f1' : '#333'};
  background: ${({ $variant }) => $variant === 'primary' ? '#6366f1' : '#1a1a24'};
  color: ${({ $variant }) => $variant === 'primary' ? '#fff' : '#ccc'};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;

  &:hover {
    background: ${({ $variant }) => $variant === 'primary' ? '#5558e6' : '#222'};
  }

  &:active {
    transform: scale(0.98);
  }
`;

// ─── Code Preview ──────────────────────────────
const CodeBlock = styled.pre`
  background: #0d0d12;
  border: 1px solid #2a2a35;
  border-radius: 8px;
  padding: 12px;
  font-size: 11px;
  color: #a0a0b0;
  overflow-x: auto;
  margin: 8px 0 0;
  max-height: 200px;
  overflow-y: auto;
  line-height: 1.5;

  &::-webkit-scrollbar { width: 4px; height: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
`;

// ─── Main Preview Area ─────────────────────────
const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  min-height: 100vh;
  position: relative;
  overflow-y: auto;
`;

const PreviewLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #555;
  margin-bottom: 16px;
`;

const PreviewContainer = styled.div`
  display: flex;
  gap: 24px;
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: center;
`;

const PreviewCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const ModalTrigger = styled.button`
  padding: 12px 28px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  background: linear-gradient(135deg, #6366f1, #a78bfa);
  color: white;
  transition: all 0.2s ease;
  font-family: inherit;
  letter-spacing: -0.01em;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const SelectedTokenDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #1a1a24;
  border: 1px solid #2a2a35;
  min-width: 200px;
`;

const SelectedTokenLogo = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
`;

const SelectedTokenInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SelectedTokenSymbol = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #fff;
`;

const SelectedTokenName = styled.span`
  font-size: 11px;
  color: #666;
`;

// ─── Docs Section in Sidebar ───────────────────
const DocsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DocItem = styled.div`
  padding: 8px 10px;
  border-radius: 8px;
  background: #1a1a24;
  border: 1px solid #2a2a35;
`;

const DocProp = styled.code`
  font-size: 11px;
  color: #a78bfa;
  font-weight: 600;
`;

const DocType = styled.code`
  font-size: 10px;
  color: #555;
  margin-left: 4px;
`;

const DocDesc = styled.p`
  margin: 4px 0 0;
  font-size: 11px;
  color: #777;
  line-height: 1.4;
`;

// ─── Tabs ──────────────────────────────────────
const TabBar = styled.div`
  display: flex;
  gap: 2px;
  background: #1a1a24;
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 12px;
`;

const Tab = styled.button<{ $isActive: boolean }>`
  flex: 1;
  padding: 7px 12px;
  border-radius: 6px;
  border: none;
  background: ${({ $isActive }) => $isActive ? '#2a2a35' : 'transparent'};
  color: ${({ $isActive }) => $isActive ? '#fff' : '#666'};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;

  &:hover {
    color: #ccc;
  }
`;

const CopiedBadge = styled.span`
  color: #22c55e;
  font-size: 11px;
  font-weight: 500;
`;

// ─── Option Toggle ─────────────────────────────
const OptionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
`;

const OptionLabel = styled.label`
  font-size: 12px;
  color: #999;
`;

const ToggleGroup = styled.div`
  display: flex;
  background: #1a1a24;
  border-radius: 6px;
  padding: 2px;
  border: 1px solid #2a2a35;
`;

const ToggleOption = styled.button<{ $isActive: boolean }>`
  padding: 5px 12px;
  border-radius: 4px;
  border: none;
  background: ${({ $isActive }) => $isActive ? '#6366f1' : 'transparent'};
  color: ${({ $isActive }) => $isActive ? '#fff' : '#666'};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;

  &:hover {
    color: ${({ $isActive }) => $isActive ? '#fff' : '#ccc'};
  }
`;

// ═══════════════════════════════════════════════
// Theme color field labels for the custom editor
// ═══════════════════════════════════════════════
const colorFieldLabels: Record<keyof ThemeColors, string> = {
  textColor: 'Text Color',
  headerFooterBg: 'Header/Footer Bg',
  background: 'Background',
  primaryColor: 'Primary Color',
  searchBackground: 'Search Background',
  searchColor: 'Search Text',
  searchBorderColor: 'Search Border',
  searchFocusBorderColor: 'Search Focus Border',
  placeholderColor: 'Placeholder',
};

// ═══════════════════════════════════════════════
// Helper: format theme as copyable JSON
// ═══════════════════════════════════════════════
const themeToCode = (theme: Theme, name?: string): string => {
  const label = name || 'custom';
  return `const ${label}Theme: Theme = ${JSON.stringify(theme, null, 2)};`;
};

// ═══════════════════════════════════════════════
// CustomWrapper — provides theme + context
// ═══════════════════════════════════════════════
const CustomWrapper = ({ children, currentTheme, options, network }: { children: ReactNode; currentTheme: Theme; options?: TokenKitOptions; network: 'SN_MAIN' | 'SN_SEPOLIA' }) => {
  return (
    <TokenKitWrapper
      network={network}
      apiKey="PDll4r90.IWeR3t3sllqZlZbnGoobgHAKhB4klhl1"
      mainnetEndpoint="https://api.tokenkithq.io"
      sepoliaEndpoint="https://api.sepolia.tokenkithq.io"
      themeObject={currentTheme}
      options={options}
    >
      {children}
    </TokenKitWrapper>
  );
};

// ═══════════════════════════════════════════════
// App
// ═══════════════════════════════════════════════
const App = () => {
  const [selectedToken, setSelectedToken] = useState<IToken | null>(null);
  const [activeThemeName, setActiveThemeName] = useState<string>('dark');
  const [sidebarTab, setSidebarTab] = useState<'presets' | 'custom' | 'docs'>('presets');
  const [copied, setCopied] = useState(false);

  // Options state
  const [tokensToLoad, setTokensToLoad] = useState<'all' | 'public'>('public');
  const [network, setNetwork] = useState<'SN_MAIN' | 'SN_SEPOLIA'>('SN_MAIN');
  const [enableRecent, setEnableRecent] = useState<boolean>(false);
  const currentOptions = useMemo<TokenKitOptions>(
    () => ({ tokensToLoad, enableRecent }),
    [tokensToLoad, enableRecent]
  );

  // Custom theme state — start from a deep copy of dark
  const [customTheme, setCustomTheme] = useState<Theme>(JSON.parse(JSON.stringify(themes.dark)));

  const currentTheme = useMemo(() => {
    return activeThemeName === '__custom__' ? customTheme : themes[activeThemeName];
  }, [activeThemeName, customTheme]);

  const selectPreset = useCallback((name: string) => {
    setActiveThemeName(name);
  }, []);

  const activateCustom = useCallback(() => {
    setActiveThemeName('__custom__');
  }, []);

  const updateCustomColor = useCallback((key: keyof ThemeColors, value: string) => {
    setCustomTheme(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
    setActiveThemeName('__custom__');
  }, []);

  const updateCustomRadius = useCallback((value: number) => {
    setCustomTheme(prev => ({ ...prev, borderRadius: value }));
    setActiveThemeName('__custom__');
  }, []);

  const loadPresetIntoCustom = useCallback((name: string) => {
    setCustomTheme(JSON.parse(JSON.stringify(themes[name])));
    setActiveThemeName('__custom__');
    setSidebarTab('custom');
  }, []);

  const copyTheme = useCallback(async (theme: Theme, name?: string) => {
    try {
      await navigator.clipboard.writeText(themeToCode(theme, name));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      const textarea = document.createElement('textarea');
      textarea.value = themeToCode(theme, name);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  return (
    <>
      <GlobalStyle />
      <PageContainer>
        {/* ─── Sidebar ──────────────────────────── */}
        <Sidebar>
          <SidebarHeader>
            <Logo>Token<span>Kit</span> Playground</Logo>
            <SubText>Theme editor &amp; component preview</SubText>
          </SidebarHeader>

          <SidebarSection style={{ paddingBottom: 8 }}>
            <TabBar>
              <Tab $isActive={sidebarTab === 'presets'} onClick={() => setSidebarTab('presets')}>Presets</Tab>
              <Tab $isActive={sidebarTab === 'custom'} onClick={() => setSidebarTab('custom')}>Custom</Tab>
              <Tab $isActive={sidebarTab === 'docs'} onClick={() => setSidebarTab('docs')}>Docs</Tab>
            </TabBar>
          </SidebarSection>

          {/* ─── Options ────────────────────────── */}
          <SidebarSection>
            <SectionTitle>Options</SectionTitle>
            <OptionRow>
              <OptionLabel>Network</OptionLabel>
              <ToggleGroup>
                <ToggleOption $isActive={network === 'SN_MAIN'} onClick={() => setNetwork('SN_MAIN')}>Mainnet</ToggleOption>
                <ToggleOption $isActive={network === 'SN_SEPOLIA'} onClick={() => setNetwork('SN_SEPOLIA')}>Sepolia</ToggleOption>
              </ToggleGroup>
            </OptionRow>
            <OptionRow>
              <OptionLabel>Tokens to Load</OptionLabel>
              <ToggleGroup>
                <ToggleOption $isActive={tokensToLoad === 'public'} onClick={() => setTokensToLoad('public')}>Public</ToggleOption>
                <ToggleOption $isActive={tokensToLoad === 'all'} onClick={() => setTokensToLoad('all')}>All</ToggleOption>
              </ToggleGroup>
            </OptionRow>
            <OptionRow>
              <OptionLabel>Recent History</OptionLabel>
              <ToggleGroup>
                <ToggleOption $isActive={!enableRecent} onClick={() => setEnableRecent(false)}>Off</ToggleOption>
                <ToggleOption $isActive={enableRecent} onClick={() => setEnableRecent(true)}>On</ToggleOption>
              </ToggleGroup>
            </OptionRow>
          </SidebarSection>

          {/* ─── Presets Tab ─────────────────────── */}
          {sidebarTab === 'presets' && (
            <SidebarSection style={{ flex: 1 }}>
              <SectionTitle>Predefined Themes</SectionTitle>
              <ThemeGrid>
                {Object.entries(themes).map(([name, theme]) => (
                  <ThemeCard
                    key={name}
                    $isActive={activeThemeName === name}
                    onClick={() => selectPreset(name)}
                  >
                    <ThemeSwatch $bg={theme.colors.background} />
                    <ThemeCardLabel>{name.charAt(0).toUpperCase() + name.slice(1)}</ThemeCardLabel>
                  </ThemeCard>
                ))}
                <ThemeCard
                  $isActive={activeThemeName === '__custom__'}
                  onClick={activateCustom}
                >
                  <ThemeSwatch $bg={customTheme.colors.background} />
                  <ThemeCardLabel>Custom</ThemeCardLabel>
                </ThemeCard>
              </ThemeGrid>

              <ActionBar>
                <ActionButton onClick={() => copyTheme(currentTheme, activeThemeName === '__custom__' ? 'custom' : activeThemeName)}>
                  {copied ? <CopiedBadge>Copied!</CopiedBadge> : 'Copy Theme'}
                </ActionButton>
                {activeThemeName !== '__custom__' && (
                  <ActionButton $variant="primary" onClick={() => loadPresetIntoCustom(activeThemeName)}>
                    Edit as Custom
                  </ActionButton>
                )}
              </ActionBar>

              <CodeBlock>{themeToCode(currentTheme, activeThemeName === '__custom__' ? 'custom' : activeThemeName)}</CodeBlock>
            </SidebarSection>
          )}

          {/* ─── Custom Tab ──────────────────────── */}
          {sidebarTab === 'custom' && (
            <SidebarSection style={{ flex: 1 }}>
              <SectionTitle>Colors</SectionTitle>
              {(Object.keys(colorFieldLabels) as (keyof ThemeColors)[]).map(key => (
                <ColorRow key={key}>
                  <ColorLabel>{colorFieldLabels[key]}</ColorLabel>
                  <ColorInputWrapper>
                    {!customTheme.colors[key].includes('gradient') && !customTheme.colors[key].includes('rgba') && (
                      <ColorSwatch
                        type="color"
                        value={customTheme.colors[key].startsWith('#') ? customTheme.colors[key] : '#000000'}
                        onChange={e => updateCustomColor(key, e.target.value)}
                      />
                    )}
                    <ColorTextInput
                      value={customTheme.colors[key]}
                      onChange={e => updateCustomColor(key, e.target.value)}
                      spellCheck={false}
                    />
                  </ColorInputWrapper>
                </ColorRow>
              ))}

              <SectionTitle style={{ marginTop: 16 }}>Layout</SectionTitle>
              <SliderRow>
                <SliderLabel>Border Radius</SliderLabel>
                <Slider
                  type="range"
                  min="0"
                  max="30"
                  value={customTheme.borderRadius}
                  onChange={e => updateCustomRadius(Number(e.target.value))}
                />
                <SliderValue>{customTheme.borderRadius}px</SliderValue>
              </SliderRow>

              <ActionBar>
                <ActionButton onClick={() => copyTheme(customTheme, 'custom')}>
                  {copied ? <CopiedBadge>Copied!</CopiedBadge> : 'Copy Custom Theme'}
                </ActionButton>
              </ActionBar>

              <SectionTitle style={{ marginTop: 16 }}>Start from preset</SectionTitle>
              <ThemeGrid>
                {Object.entries(themes).map(([name, theme]) => (
                  <ThemeCard
                    key={name}
                    $isActive={false}
                    onClick={() => loadPresetIntoCustom(name)}
                  >
                    <ThemeSwatch $bg={theme.colors.background} />
                    <ThemeCardLabel>{name.charAt(0).toUpperCase() + name.slice(1)}</ThemeCardLabel>
                  </ThemeCard>
                ))}
              </ThemeGrid>
            </SidebarSection>
          )}

          {/* ─── Docs Tab ────────────────────────── */}
          {sidebarTab === 'docs' && (
            <SidebarSection style={{ flex: 1 }}>
              <SectionTitle>Theme Interface</SectionTitle>
              <CodeBlock>{`interface Theme {
  colors: ThemeColors;
  fonts: { fontFamily: string };
  borderRadius: number;
  height: string; // e.g. "60dvh"
}`}</CodeBlock>

              <SectionTitle style={{ marginTop: 16 }}>ThemeColors Properties</SectionTitle>
              <DocsList>
                <DocItem>
                  <DocProp>textColor</DocProp><DocType>string</DocType>
                  <DocDesc>Primary text color used for labels, names, and symbols throughout the modal.</DocDesc>
                </DocItem>
                <DocItem>
                  <DocProp>background</DocProp><DocType>string</DocType>
                  <DocDesc>Main background of the token selection container. Supports solid colors and CSS gradients.</DocDesc>
                </DocItem>
                <DocItem>
                  <DocProp>headerFooterBg</DocProp><DocType>string</DocType>
                  <DocDesc>Background for header, footer, and hover states on token items. Also used as token logo placeholder bg.</DocDesc>
                </DocItem>
                <DocItem>
                  <DocProp>primaryColor</DocProp><DocType>string</DocType>
                  <DocDesc>Accent color for links and interactive highlights (e.g. "List here" link).</DocDesc>
                </DocItem>
                <DocItem>
                  <DocProp>searchBackground</DocProp><DocType>string</DocType>
                  <DocDesc>Background color of the search input field.</DocDesc>
                </DocItem>
                <DocItem>
                  <DocProp>searchColor</DocProp><DocType>string</DocType>
                  <DocDesc>Text color inside the search input.</DocDesc>
                </DocItem>
                <DocItem>
                  <DocProp>searchBorderColor</DocProp><DocType>string</DocType>
                  <DocDesc>Default border color of the search input.</DocDesc>
                </DocItem>
                <DocItem>
                  <DocProp>searchFocusBorderColor</DocProp><DocType>string</DocType>
                  <DocDesc>Border color when the search input is focused.</DocDesc>
                </DocItem>
                <DocItem>
                  <DocProp>placeholderColor</DocProp><DocType>string</DocType>
                  <DocDesc>Color for search placeholder text and scrollbar thumbs.</DocDesc>
                </DocItem>
              </DocsList>

              <SectionTitle style={{ marginTop: 16 }}>Other Properties</SectionTitle>
              <DocsList>
                <DocItem>
                  <DocProp>fonts.fontFamily</DocProp><DocType>string</DocType>
                  <DocDesc>CSS font-family string. Default: "'Inter', sans-serif".</DocDesc>
                </DocItem>
                <DocItem>
                  <DocProp>borderRadius</DocProp><DocType>number</DocType>
                  <DocDesc>Border radius in pixels for the container. Token items use a capped value (max 12px).</DocDesc>
                </DocItem>
                <DocItem>
                  <DocProp>height</DocProp><DocType>string</DocType>
                  <DocDesc>Default height of the container, e.g. "60dvh". Can be overridden via the modalHeight prop.</DocDesc>
                </DocItem>
              </DocsList>

              <SectionTitle style={{ marginTop: 16 }}>Usage Example</SectionTitle>
              <CodeBlock>{`import { TokenKitWrapper, SelectTokenModal, themes } from 'starknet-tokenkit';

// Using a predefined theme
<TokenKitWrapper
  network="SN_MAIN"
  apiKey="your-api-key"
  mainnetEndpoint="https://api.tokenkithq.io"
  sepoliaEndpoint="https://api.sepolia.tokenkithq.io"
  themeObject={themes.dark}
>
  <SelectTokenModal
    selectedToken={selected}
    callBackFunc={setSelected}
    modalHeight="90dvh"
    modalWidth="420px"
  >
    <button>Select Token</button>
  </SelectTokenModal>
</TokenKitWrapper>

// Using a custom theme
const myTheme: Theme = {
  colors: {
    textColor: '#f5f5f5',
    headerFooterBg: '#2c2c2c',
    background: '#1a1a1a',
    primaryColor: '#646cff',
    searchBackground: '#2c2c2c',
    searchColor: '#f5f5f5',
    searchBorderColor: '#444444',
    searchFocusBorderColor: '#646cff',
    placeholderColor: '#888888',
  },
  fonts: { fontFamily: "'Inter', sans-serif" },
  borderRadius: 20,
  height: '60dvh',
};`}</CodeBlock>

              <SectionTitle style={{ marginTop: 16 }}>Available Presets</SectionTitle>
              <DocsList>
                {Object.keys(themes).map(name => (
                  <DocItem key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ThemeSwatch $bg={themes[name].colors.background} />
                    <div>
                      <DocProp>themes.{name}</DocProp>
                      <DocDesc style={{ margin: 0 }}>borderRadius: {themes[name].borderRadius}px</DocDesc>
                    </div>
                  </DocItem>
                ))}
              </DocsList>
            </SidebarSection>
          )}
        </Sidebar>

        {/* ─── Main Preview ─────────────────────── */}
        <MainContent>
          <PreviewLabel>Live Preview — {activeThemeName === '__custom__' ? 'Custom Theme' : activeThemeName.charAt(0).toUpperCase() + activeThemeName.slice(1)}</PreviewLabel>

          <PreviewContainer>
            <PreviewCard>
              <CustomWrapper currentTheme={currentTheme} options={currentOptions} network={network}>
                <SelectTokenModal callBackFunc={setSelectedToken} selectedToken={selectedToken} modalHeight="90dvh" modalWidth="420px">
                  <ModalTrigger>Select Token (Modal)</ModalTrigger>
                </SelectTokenModal>
              </CustomWrapper>
              {selectedToken && (
                <SelectedTokenDisplay>
                  {selectedToken.logo && <SelectedTokenLogo src={selectedToken.logo} alt={selectedToken.symbol} />}
                  <SelectedTokenInfo>
                    <SelectedTokenSymbol>{selectedToken.symbol}</SelectedTokenSymbol>
                    <SelectedTokenName>{selectedToken.name}</SelectedTokenName>
                  </SelectedTokenInfo>
                </SelectedTokenDisplay>
              )}
            </PreviewCard>

            <PreviewCard>
              <CustomWrapper currentTheme={currentTheme} options={currentOptions} network={network}>
                <SelectTokenContainer
                  selectedToken={selectedToken}
                  callBackFunc={setSelectedToken}
                  modalHeight="calc(100dvh - 120px)"
                  modalWidth="420px"
                />
              </CustomWrapper>
            </PreviewCard>
          </PreviewContainer>
        </MainContent>
      </PageContainer>
    </>
  );
};

export default App;
