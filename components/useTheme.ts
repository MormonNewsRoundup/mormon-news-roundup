import { useColorScheme } from '@/components/useColorScheme';
import { darkPalette, lightPalette, type Palette } from '@/constants/theme';

export function useTheme(): Palette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkPalette : lightPalette;
}
