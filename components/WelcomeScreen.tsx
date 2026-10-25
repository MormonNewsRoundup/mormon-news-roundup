import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_PITCH, DISCLAIMER } from '@/constants/config';
import { serifFamily } from '@/constants/theme';

type WelcomeScreenProps = {
  onContinue: () => void;
};

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <Text style={styles.kicker}>MORMON NEWS ROUNDUP</Text>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.pitch}>{APP_PITCH}</Text>
          <Text style={styles.body}>
            A daily feed of hard news about the Latter-day Saint church: lawsuits and legal action,
            court cases, excommunications, scandals, and major official announcements. Articles,
            videos, podcasts, and TikToks, already sorted.
          </Text>
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
          </View>
          <Text style={styles.note}>
            Tap a card to open the original article, video, podcast, or TikTok.
          </Text>
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          onPress={onContinue}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1D1838',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  content: {
    paddingTop: 28,
    paddingBottom: 24,
    gap: 14,
  },
  kicker: {
    color: '#F5E6B3',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  title: {
    fontFamily: serifFamily,
    color: '#FFFFFF',
    fontSize: 40,
    lineHeight: 44,
  },
  pitch: {
    color: '#F5E6B3',
    fontSize: 18,
    lineHeight: 26,
  },
  body: {
    color: '#F6F1E7',
    fontSize: 16,
    lineHeight: 24,
  },
  disclaimer: {
    borderLeftWidth: 3,
    borderLeftColor: '#F5E6B3',
    backgroundColor: '#14122A',
    borderRadius: 10,
    padding: 14,
    marginTop: 6,
  },
  disclaimerText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  note: {
    color: '#C3B8D4',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#F5E6B3',
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#1D1838',
    fontSize: 17,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
});
