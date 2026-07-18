import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../navigation/RootNavigator';

/**
 * About / article screen.
 *
 * Why: Doubles as a static article viewer for Help & Support content (privacy
 * policy, terms, guidelines, contact). When opened from Help & Support it shows
 * the relevant article; opened directly it shows the About SAPIO page.
 */
type AboutRouteProp = RouteProp<AppStackParamList, 'About'>;

const ARTICLES: Record<string, string> = {
  privacy:
    'Privacy Policy\n\nSAPIO respects your privacy. We collect only the data needed to operate the service: your profile, photos, location (for discovery), and usage signals. You can control visibility via Privacy settings. We never sell your data. Deleting your account soft-removes your profile from discovery while retaining legal records.',
  terms:
    'Terms of Service\n\nBy using SAPIO you agree to be respectful, truthful, and lawful. We may suspend accounts that violate these terms. Premium features are billed per their plan. You may delete your account at any time from Settings.',
  guidelines:
    'Community Guidelines\n\nBe kind. No harassment, hate speech, nudity, or solicitation. Use real photos. Report behavior that breaks the rules. Verified members help keep the community safe.',
  contact:
    'Contact Support\n\nNeed help? Email support@sapio.app or use the in-app report tools. We typically respond within 48 hours.',
  about:
    'About SAPIO\n\nSAPIO is a dating app built around meaningful, verified connections. Version 1.0.0.\n\n© SAPIO. All rights reserved.',
};

export function AboutScreen({ route }: { route?: AboutRouteProp }) {
  const article = (route?.params as { article?: string } | undefined)?.article;
  const raw = article ? ARTICLES[article] : ARTICLES.about;
  const splitAt = raw.indexOf('\n\n');
  const title = splitAt > -1 ? raw.slice(0, splitAt) : 'About SAPIO';
  const body = splitAt > -1 ? raw.slice(splitAt + 2) : raw;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12, color: '#1c1c1e' },
  body: { fontSize: 15, lineHeight: 22, color: '#3a3a3c' },
});
