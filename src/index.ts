// Import components first
import SelectTokenModal from './components/SelectTokenModal';
import useDebounce from './hooks/useDebounce';
import TokenKitProvider from './providers/TokenKitProvider';
import { useTokenKitContext } from './providers/TokenkitContext';
import TokenBtn from './components/TokenBtn';
import TokenListItem from './components/TokenListItem';
import CloseSvg from './components/icons/CloseSvg';
import TokenKitWrapper from './wrappers/TokenKitWrapper';
// import * as Types from './types';
import { themes } from './styles/theme';
import SelectTokenContainer from './components/SelectTokenContainer';

// Then export them
export {
    SelectTokenModal,
    SelectTokenContainer,
    useDebounce,
    TokenKitProvider,
    useTokenKitContext,
    TokenBtn,
    TokenListItem,
    CloseSvg,
    TokenKitWrapper
};

// Export types separately
export * from './types';
// export { Types }
export { themes }

// Re-export utility helpers so SDK consumers can use the same
// address / decimals / formatting primitives the picker uses internally.
// (Documented in docs/sdk/v1/tokenkit-utils.mdx.)
export {
    bigintToLongAddress,
    convertToReadableTokens,
    formatNumberInternational,
    limitChars,
    removeTrailingZeros,
    timeStampToDate,
} from './utils';

// Starknet error parsing: pure TS, React-free, tree-shakeable.
export { parseStarknetError, formatStarknetError, selectorFromName } from './errors';
export type {
    ParsedStarknetError,
    ParseStarknetErrorOptions,
    StarknetErrorConfidence,
    StarknetErrorFrame,
    StarknetErrorKind,
} from './errors';
