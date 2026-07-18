import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * LoadingChatScreen — centered spinner for chat loading states.
 *
 * Why: Reused by ChatListScreen and ConversationScreen while data loads. Pure UI.
 */
export function LoadingChatScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#fd5068" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
