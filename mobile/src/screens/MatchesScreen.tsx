import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMatchStore } from '../store/matchStore';
import { MatchCard } from '../components/MatchCard';
import { EmptyMatchesScreen } from '../components/EmptyMatchesScreen';
import { ItsAMatchModal } from '../components/ItsAMatchModal';
import type { AppStackParamList } from '../navigation/RootNavigator';
import type { Match } from '../lib/api/match.api';

type MatchesNav = NativeStackNavigationProp<AppStackParamList, 'Matches'>;

/**
 * MatchesScreen — the list of the user's mutual matches.
 *
 * Why: Reads `matches` from `matchStore` and renders a `MatchCard` per row, or
 * an empty state when there are none. Tapping a match opens the conversation
 * (the backend get-or-creates it from the match id). It also observes
 * `newMatch` and pops the "It's a Match!" modal whenever the swipe flow
 * produces a mutual LIKE; "Send Message" now opens the chat. Messaging is
 * gated on an active match server-side.
 */
export function MatchesScreen() {
  const navigation = useNavigation<MatchesNav>();
  const matches = useMatchStore((s) => s.matches);
  const loading = useMatchStore((s) => s.loading);
  const fetchMatches = useMatchStore((s) => s.fetchMatches);
  const newMatch = useMatchStore((s) => s.newMatch);
  const clearNewMatch = useMatchStore((s) => s.clearNewMatch);

  React.useEffect(() => {
    void fetchMatches();
  }, [fetchMatches]);

  const openConversation = React.useCallback(
    (matchId: string) => {
      navigation.navigate('Conversation', { matchId });
    },
    [navigation],
  );

  const handleKeepSwiping = React.useCallback(() => {
    clearNewMatch();
  }, [clearNewMatch]);

  const handleSendMessage = React.useCallback(() => {
    if (newMatch?.matchId) openConversation(newMatch.matchId);
    clearNewMatch();
  }, [newMatch, openConversation, clearNewMatch]);

  if (!loading && matches.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyMatchesScreen />
        <ItsAMatchModal
          visible={Boolean(newMatch)}
          matchedUser={newMatch?.matchedUser ?? null}
          onKeepSwiping={handleKeepSwiping}
          onSendMessage={handleSendMessage}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item: Match) => item.id}
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            onPress={(m) => openConversation(m.id)}
          />
        )}
        contentContainerStyle={styles.list}
      />
      <ItsAMatchModal
        visible={Boolean(newMatch)}
        matchedUser={newMatch?.matchedUser ?? null}
        onKeepSwiping={handleKeepSwiping}
        onSendMessage={handleSendMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  list: {
    paddingVertical: 8,
  },
});
