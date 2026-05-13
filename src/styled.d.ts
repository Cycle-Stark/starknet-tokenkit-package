import 'styled-components';
import { Theme } from './types';

declare module 'styled-components' {
  // styled-components requires an interface for module augmentation
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Theme {}
}
