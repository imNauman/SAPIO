import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingSection } from '../components/SettingSection';
import { SettingItem } from '../components/SettingItem';
import type { AppStackParamList } from '../navigation/RootNavigator';

/**
 * Help & Support screen.
 *
 * Why: Static, in-app links to legal/help content. Each item opens the About
 * screen in "article" mode with the relevant copy. No backend calls.
 */
type Article = 'privacy' | 'terms' | 'guidelines' | 'contact' | 'about';

export function HelpSupportScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const open = (article: Article) => {
    navigation.navigate('About', { article });
  };

  return (
    <ScrollView style={styles.container}>
      <SettingSection title="Help & Support">
        <SettingItem
          label="Privacy Policy"
          icon="document-text-outline"
          onPress={() => open('privacy')}
        />
        <SettingItem
          label="Terms of Service"
          icon="document-text-outline"
          onPress={() => open('terms')}
        />
        <SettingItem
          label="Community Guidelines"
          icon="people-outline"
          onPress={() => open('guidelines')}
        />
        <SettingItem
          label="Contact Support"
          icon="mail-outline"
          onPress={() => open('contact')}
        />
        <SettingItem
          label="About SAPIO"
          icon="information-circle-outline"
          onPress={() => open('about')}
        />
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
});
