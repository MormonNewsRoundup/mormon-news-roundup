import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { serifFamily } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>That screen isn’t in the app.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to Today</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F6F1E7',
    gap: 12,
  },
  title: {
    fontFamily: serifFamily,
    fontSize: 22,
    textAlign: 'center',
    color: '#1D1838',
  },
  link: { paddingVertical: 12 },
  linkText: { fontSize: 16, fontWeight: '700', color: '#3F2D86' },
});
