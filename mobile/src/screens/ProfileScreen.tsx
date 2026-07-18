import { View, Text, StyleSheet } from 'react-native';

/**
 * Placeholder Profile screen.
 *
 * Why: Second route in the stack to demonstrate multi-screen navigation wiring.
 */
export function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600' },
});
