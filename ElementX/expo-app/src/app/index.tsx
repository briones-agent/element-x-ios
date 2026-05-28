import {
  popToNative,
  useSharedState,
  sendMessage,
  addMessageListener,
} from 'expo-brownfield';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface Room {
  id: number;
  name: string;
  alias: string;
  initials: string;
  color: string;
  preview: string;
  unread: number;
  avatarUrl?: string;
  encrypted: boolean;
}

const ELEMENT_GREEN = '#0DBD8B';

export default function ElementSafetyDashboard() {
  const scheme = useColorScheme();
  const cardBg = scheme === 'dark' ? '#1C1C1E' : '#F2F2F7';
  const subtle = scheme === 'dark' ? '#3A3A3C' : '#E5E5EA';
  const muted = scheme === 'dark' ? '#8E8E93' : '#6E6E73';

  const [rooms] = useSharedState<Room[]>('rooms', []);
  const [encryptedSessions] = useSharedState<number>('encryptedSessions', 0);
  const [verifiedDevices] = useSharedState<number>('verifiedDevices', 0);
  const [pendingInvites] = useSharedState<number>('pendingInvites', 0);
  const [lastSyncedAt] = useSharedState<string>('lastSyncedAt', '');

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const sub = addMessageListener((msg) => {
      if (msg.type === 'ROOM_OPENED') {
        setToast(`Opening "${msg.name}"…`);
      } else if (msg.type === 'KEYS_VERIFIED') {
        setToast('Cross-signing keys re-verified');
      }
      setTimeout(() => setToast(null), 2200);
    });
    return () => sub.remove();
  }, []);

  const time = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: subtle }]}>
          <ThemedText style={styles.headerTitle}>Safety dashboard</ThemedText>
          <Pressable
            onPress={() => popToNative(true)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: ELEMENT_GREEN, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <ThemedText style={styles.closeText}>Done</ThemedText>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={[styles.icon, { backgroundColor: ELEMENT_GREEN }]}>
              <ThemedText style={styles.iconGlyph}>🔒</ThemedText>
            </View>
            <ThemedText type="title" style={styles.title}>
              Encrypted by default
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: muted }]}>
              Rendered by React Native inside Element X — dismiss via{' '}
              <ThemedText style={styles.code}>popToNative()</ThemedText>
            </ThemedText>
          </View>

          <View style={styles.statsRow}>
            <Stat
              label="Encrypted"
              value={String(encryptedSessions ?? 0)}
              bg={cardBg}
            />
            <Stat
              label="Verified"
              value={String(verifiedDevices ?? 0)}
              bg={cardBg}
            />
            <Stat
              label="Invites"
              value={String(pendingInvites ?? 0)}
              bg={cardBg}
            />
          </View>

          <Pressable
            onPress={() => sendMessage({ type: 'VERIFY_KEYS' })}
            style={({ pressed }) => [
              styles.actionRow,
              { backgroundColor: cardBg, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.actionTitle}>
                Re-verify cross-signing keys
              </ThemedText>
              <ThemedText style={[styles.actionSubtitle, { color: muted }]}>
                Last synced {time}
              </ThemedText>
            </View>
            <ThemedText style={[styles.chevron, { color: ELEMENT_GREEN }]}>
              ✓
            </ThemedText>
          </Pressable>

          <ThemedText style={[styles.section, { color: muted }]}>
            Recent rooms · tap to open
          </ThemedText>

          <View style={[styles.list, { backgroundColor: cardBg }]}>
            {(rooms ?? []).map((r, idx) => (
              <Pressable
                key={r.id}
                onPress={() => {
                  sendMessage({ type: 'OPEN_ROOM', id: r.id, name: r.name });
                  setTimeout(() => popToNative(true), 350);
                }}
                style={({ pressed }) => [
                  styles.row,
                  idx < (rooms?.length ?? 0) - 1 && {
                    borderBottomColor: subtle,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                  pressed && { opacity: 0.6 },
                ]}
              >
                {r.avatarUrl ? (
                  <Image
                    source={{ uri: r.avatarUrl }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: r.color }]}>
                    <ThemedText style={styles.avatarText}>
                      {r.initials}
                    </ThemedText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.rowHead}>
                    <ThemedText style={styles.rowTitle} numberOfLines={1}>
                      {r.name}
                    </ThemedText>
                    {r.encrypted && (
                      <ThemedText style={[styles.lock, { color: ELEMENT_GREEN }]}>
                        🔒
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText
                    style={[styles.rowAlias, { color: muted }]}
                    numberOfLines={1}
                  >
                    {r.alias} · {r.preview}
                  </ThemedText>
                </View>
                {r.unread > 0 && (
                  <View
                    style={[styles.unread, { backgroundColor: ELEMENT_GREEN }]}
                  >
                    <ThemedText style={styles.unreadText}>{r.unread}</ThemedText>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {toast && (
            <View style={[styles.toast, { backgroundColor: ELEMENT_GREEN }]}>
              <ThemedText style={styles.toastText}>{toast}</ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Stat({
  label,
  value,
  bg,
}: {
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  closeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  closeText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  scroll: { padding: Spacing.three, gap: Spacing.three },
  hero: { alignItems: 'center', paddingTop: Spacing.two, gap: 8 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: { fontSize: 32 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 12 },
  code: { fontFamily: 'Menlo', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  stat: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: 12,
    gap: Spacing.two,
  },
  actionTitle: { fontSize: 15, fontWeight: '600' },
  actionSubtitle: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: '700' },
  section: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  list: { borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    gap: Spacing.two,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  lock: { fontSize: 11 },
  rowAlias: { fontSize: 12, marginTop: 2 },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toastText: { color: '#fff', fontWeight: '600' },
});
