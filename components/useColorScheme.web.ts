import { useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

/**
 * The first web render stays light so it matches the server HTML.
 * After mount, follow the phone or browser appearance setting.
 */
export function useColorScheme(): 'light' | 'dark' {
  const scheme = useSystemColorScheme();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return 'light';
  return scheme === 'dark' ? 'dark' : 'light';
}
