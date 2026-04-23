import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import * as React from 'react';
import {
  Dimensions,
  FlatList,
  InteractionManager,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { wp } from 'y2kit-tools';
import { useI18n } from '../i18n/useI18n';
import { useTheme } from '../theme/useTheme';
import { cardToast } from '../services/CardToastService';
import { Text } from '../ui/Text';
import {
  debugLogManager,
  type DebugLogEntry,
  type DebugLogType,
} from './LogManager';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const BUTTON_SIZE = wp(60);
const BUTTON_ICON_SIZE = wp(28);
const LOG_LEVELS: DebugLogType[] = ['log', 'info', 'warn', 'error', 'debug'];
const BUTTON_HIT_SLOP = {
  top: Math.round(wp(12)),
  bottom: Math.round(wp(12)),
  left: Math.round(wp(12)),
  right: Math.round(wp(12)),
};
const ICON_HIT_SLOP = {
  top: Math.round(wp(8)),
  bottom: Math.round(wp(8)),
  left: Math.round(wp(8)),
  right: Math.round(wp(8)),
};
const TOGGLE_HIT_SLOP = {
  top: Math.round(wp(6)),
  bottom: Math.round(wp(6)),
  left: Math.round(wp(6)),
  right: Math.round(wp(6)),
};

type SortOrder = 'asc' | 'desc';
type TabKey = 'logs' | 'network';

export type FloatingDebuggerControllerHandle = {
  show: (() => void) | null;
  hide: (() => void) | null;
};

export const FloatingDebuggerController: FloatingDebuggerControllerHandle = {
  show: null,
  hide: null,
};

export type FloatingDebuggerProps = {
  initialVisible?: boolean;
  enableNetworkTab?: boolean;
};

type NetworkLoggerComponent = React.ComponentType<Record<string, unknown>>;

function getLevelTone(type: DebugLogType) {
  if (type === 'warn') {
    return {
      container: styles.warnTone,
      label: styles.warnLabel,
    };
  }

  if (type === 'error') {
    return {
      container: styles.errorTone,
      label: styles.errorLabel,
    };
  }

  if (type === 'info') {
    return {
      container: styles.infoTone,
      label: styles.infoLabel,
    };
  }

  if (type === 'debug') {
    return {
      container: styles.debugTone,
      label: styles.debugLabel,
    };
  }

  return {
    container: styles.logTone,
    label: styles.logLabel,
  };
}

function ExpandableText({
  text,
  collapsedLines = 6,
  threshold = 400,
}: {
  text: string;
  collapsedLines?: number;
  threshold?: number;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = React.useState(false);

  const needsToggle = React.useMemo(() => {
    if (!text) return false;
    return (
      text.length > threshold ||
      (text.includes('\n') && text.split('\n').length > collapsedLines)
    );
  }, [collapsedLines, text, threshold]);

  return (
    <View>
      <Text style={styles.logMessage} numberOfLines={expanded ? undefined : collapsedLines}>
        {text}
      </Text>
      {needsToggle ? (
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={TOGGLE_HIT_SLOP}
          onPress={() => setExpanded((prev) => !prev)}
        >
          <Text style={styles.toggleLink}>
            {expanded ? t('debug.floatingDebugger.collapse') : t('debug.floatingDebugger.expand')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function FloatingDebuggerPanel({ enableNetworkTab }: { enableNetworkTab: boolean }) {
  const { t } = useI18n();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabKey>('logs');
  const [logs, setLogs] = React.useState<DebugLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState('');
  const [selectedLevels, setSelectedLevels] = React.useState<Record<DebugLogType, boolean>>({
    log: true,
    info: true,
    warn: true,
    error: true,
    debug: true,
  });
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc');
  const [contentReady, setContentReady] = React.useState(false);
  const [networkLoggerComp, setNetworkLoggerComp] = React.useState<NetworkLoggerComponent | null>(
    null
  );
  const [networkLoggerLoadFailed, setNetworkLoggerLoadFailed] = React.useState(false);

  const rafIdRef = React.useRef<number | null>(null);
  const pendingUpdateRef = React.useRef(false);

  React.useEffect(() => {
    debugLogManager.enable();
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  React.useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    if (modalVisible) {
      const handle = InteractionManager.runAfterInteractions(() => {
        if (!mounted) return;
        setContentReady(true);
        setLogs(debugLogManager.getLogs());

        unsubscribe = debugLogManager.addListener((type) => {
          if (type !== 'log' && type !== 'error' && type !== 'clear') return;
          if (pendingUpdateRef.current) return;

          pendingUpdateRef.current = true;
          rafIdRef.current = requestAnimationFrame(() => {
            pendingUpdateRef.current = false;
            setLogs(debugLogManager.getLogs());
          });
        });
      });

      return () => {
        mounted = false;
        handle.cancel();
        unsubscribe?.();
        if (rafIdRef.current != null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        pendingUpdateRef.current = false;
        setContentReady(false);
      };
    }

    setContentReady(false);
    return undefined;
  }, [modalVisible]);

  React.useEffect(() => {
    if (!enableNetworkTab || activeTab !== 'network' || networkLoggerComp || networkLoggerLoadFailed) {
      return;
    }

    import('react-native-network-logger')
      .then((mod) => {
        const component = (mod.default || mod.NetworkLogger || mod) as NetworkLoggerComponent;
        setNetworkLoggerComp(() => component);
      })
      .catch((error) => {
        setNetworkLoggerLoadFailed(true);
        console.warn('[FloatingDebugger] Failed to load network logger', error);
      });
  }, [activeTab, enableNetworkTab, networkLoggerComp, networkLoggerLoadFailed]);

  const translateX = useSharedValue(screenWidth - BUTTON_SIZE - wp(20));
  const translateY = useSharedValue(wp(100));
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const screenBounds = React.useMemo(
    () => ({
      minX: insets.left,
      minY: insets.top,
      maxX: screenWidth - insets.right - BUTTON_SIZE,
      maxY: screenHeight - insets.bottom - BUTTON_SIZE,
    }),
    [insets]
  );

  const panGesture = React.useMemo(() => {
    const { minX, minY, maxX, maxY } = screenBounds;

    return Gesture.Pan()
      .onStart(() => {
        offsetX.value = translateX.value;
        offsetY.value = translateY.value;
      })
      .onUpdate((event) => {
        const nextX = offsetX.value + event.translationX;
        const nextY = offsetY.value + event.translationY;
        translateX.value = Math.max(minX, Math.min(maxX, nextX));
        translateY.value = Math.max(minY, Math.min(maxY, nextY));
      })
      .onEnd(() => {
        translateX.value = withSpring(
          Math.max(minX, Math.min(maxX, translateX.value)),
          SPRING_CONFIG
        );
        translateY.value = withSpring(
          Math.max(minY, Math.min(maxY, translateY.value)),
          SPRING_CONFIG
        );
      });
  }, [offsetX, offsetY, screenBounds, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const toggleLevel = React.useCallback((level: DebugLogType) => {
    setSelectedLevels((prev) => ({ ...prev, [level]: !prev[level] }));
  }, []);

  const filteredLogs = React.useMemo(() => {
    const query = debouncedSearchQuery.trim();
    const base = query ? debugLogManager.searchLogs(query) : logs;
    const allSelected = LOG_LEVELS.every((level) => selectedLevels[level]);
    if (allSelected) return base;
    return base.filter((log) => Boolean(selectedLevels[log.type]));
  }, [debouncedSearchQuery, logs, selectedLevels]);

  const maintainVisibleContentPosition = React.useMemo(
    () => ({ minIndexForVisible: 0, autoscrollToTopThreshold: wp(24) }),
    []
  );

  const handleCopy = React.useCallback(
    async (text: string, successMessage: string) => {
      try {
        await Clipboard.setStringAsync(text);
        cardToast.showSuccess(successMessage);
      } catch {
        cardToast.showError(t('debug.floatingDebugger.copyFailed'));
      }
    },
    [t]
  );

  const renderLogItem = React.useCallback(
    ({ item }: { item: DebugLogEntry }) => {
      const tone = getLevelTone(item.type);

      return (
        <View style={[styles.logItem, tone.container]}>
          <View style={styles.logHeader}>
            <Text style={[styles.logType, tone.label]}>{item.type.toUpperCase()}</Text>
            <View style={styles.logHeaderRight}>
              <Text style={styles.timestamp}>{item.timestamp}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityLabel={t('debug.floatingDebugger.copySingleA11y')}
                hitSlop={ICON_HIT_SLOP}
                onPress={() =>
                  handleCopy(item.message, t('debug.floatingDebugger.copySingleSuccess'))
                }
                style={styles.copyButton}
              >
                <MaterialIcons
                  color={theme.colors.primary}
                  name="content-copy"
                  size={wp(16)}
                />
              </TouchableOpacity>
            </View>
          </View>
          <ExpandableText text={item.message} />
        </View>
      );
    },
    [handleCopy, t, theme.colors.primary]
  );

  const renderNetworkContent = React.useCallback(() => {
    if (!contentReady) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('debug.floatingDebugger.loading')}</Text>
        </View>
      );
    }

    if (networkLoggerComp) {
      const NetworkLogger = networkLoggerComp;
      return (
        <NetworkLogger
          compact
          maxRequests={100}
          sort="desc"
          theme="light"
        />
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {networkLoggerLoadFailed
            ? t('debug.floatingDebugger.networkUnavailable')
            : t('debug.floatingDebugger.networkLoading')}
        </Text>
      </View>
    );
  }, [contentReady, networkLoggerComp, networkLoggerLoadFailed, t]);

  return (
    <>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.floatingButton, animatedStyle]}>
          <TouchableOpacity
            activeOpacity={0.85}
            hitSlop={BUTTON_HIT_SLOP}
            onPress={() => setModalVisible(true)}
            style={[styles.buttonContainer, { backgroundColor: theme.colors.primary }]}
          >
            <MaterialIcons color={theme.colors.onPrimary} name="bug-report" size={BUTTON_ICON_SIZE} />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>

      <Modal
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        presentationStyle="fullScreen"
        statusBarTranslucent
        visible={modalVisible}
      >
        {/*
          RN Modal 会挂到单独的原生宿主上，不能稳定复用外层 SafeAreaProvider。
          这里把 modal 自己作为一个新的 safe-area 根节点，避免顶部 inset 偶发丢失。
        */}
        <SafeAreaProvider>
          <SafeAreaView
            style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
            edges={['top']}
          >
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                {t('debug.floatingDebugger.title')}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                hitSlop={ICON_HIT_SLOP}
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons color={theme.colors.muted} name="close" size={wp(18)} />
              </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setActiveTab('logs')}
                style={[
                  styles.tab,
                  activeTab === 'logs' && {
                    borderBottomColor: theme.colors.primary,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === 'logs' ? theme.colors.primary : theme.colors.muted,
                    },
                  ]}
                >
                  {t('debug.floatingDebugger.logsTab')}
                </Text>
              </TouchableOpacity>

              {enableNetworkTab ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setActiveTab('network')}
                  style={[
                    styles.tab,
                    activeTab === 'network' && {
                      borderBottomColor: theme.colors.primary,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          activeTab === 'network' ? theme.colors.primary : theme.colors.muted,
                      },
                    ]}
                  >
                    {t('debug.floatingDebugger.networkTab')}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {activeTab === 'logs' ? (
              <View style={styles.tabContent}>
                <View style={styles.searchRow}>
                  <TextInput
                    clearButtonMode="while-editing"
                    onChangeText={setSearchQuery}
                    placeholder={t('debug.floatingDebugger.searchPlaceholder')}
                    placeholderTextColor={theme.colors.muted}
                    style={[
                      styles.searchInput,
                      {
                        borderColor: theme.colors.border,
                        color: theme.colors.onSurface,
                      },
                    ]}
                    value={searchQuery}
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    accessibilityLabel={t('debug.floatingDebugger.copyVisibleA11y')}
                    onPress={() => {
                      const text = filteredLogs
                        .map(
                          (log) =>
                            `[${log.type.toUpperCase()}] ${log.timestamp} ${log.message}`
                        )
                        .join('\n');
                      void handleCopy(
                        text,
                        t('debug.floatingDebugger.copyVisibleSuccess')
                      );
                    }}
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                  >
                    <MaterialIcons
                      color={theme.colors.onPrimary}
                      name="content-copy"
                      size={wp(18)}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      debugLogManager.clearLogs();
                      setSearchQuery('');
                    }}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>{t('debug.floatingDebugger.clear')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.filterRow}>
                  {LOG_LEVELS.map((level) => {
                    const active = selectedLevels[level];
                    return (
                      <TouchableOpacity
                        key={level}
                        activeOpacity={0.8}
                        onPress={() => toggleLevel(level)}
                        style={[
                          styles.filterChip,
                          active && {
                            borderColor: theme.colors.primary,
                            backgroundColor: theme.colors.secondary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            { color: active ? theme.colors.primary : theme.colors.muted },
                          ]}
                        >
                          {level.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.filterRow}>
                  <View style={styles.filterSpacer} />
                  {(['asc', 'desc'] as SortOrder[]).map((order) => {
                    const active = sortOrder === order;
                    return (
                      <TouchableOpacity
                        key={order}
                        activeOpacity={0.8}
                        onPress={() => setSortOrder(order)}
                        style={[
                          styles.filterChip,
                          active && {
                            borderColor: theme.colors.primary,
                            backgroundColor: theme.colors.secondary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            { color: active ? theme.colors.primary : theme.colors.muted },
                          ]}
                        >
                          {order === 'asc'
                            ? t('debug.floatingDebugger.sortAsc')
                            : t('debug.floatingDebugger.sortDesc')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {!contentReady ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>{t('debug.floatingDebugger.loading')}</Text>
                  </View>
                ) : filteredLogs.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {searchQuery
                        ? t('debug.floatingDebugger.noSearchResult')
                        : t('debug.floatingDebugger.noLogs')}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredLogs}
                    initialNumToRender={4}
                    inverted={sortOrder === 'asc'}
                    keyExtractor={(item) => item.id}
                    maintainVisibleContentPosition={maintainVisibleContentPosition}
                    maxToRenderPerBatch={4}
                    removeClippedSubviews
                    renderItem={renderLogItem}
                    style={styles.scrollContent}
                    windowSize={7}
                  />
                )}
              </View>
            ) : (
              <View style={styles.tabContent}>{renderNetworkContent()}</View>
            )}
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

export function FloatingDebugger({
  initialVisible = true,
  enableNetworkTab = true,
}: FloatingDebuggerProps) {
  const [isVisible, setIsVisible] = React.useState(initialVisible);

  React.useEffect(() => {
    FloatingDebuggerController.show = () => setIsVisible(true);
    FloatingDebuggerController.hide = () => setIsVisible(false);

    return () => {
      FloatingDebuggerController.show = null;
      FloatingDebuggerController.hide = null;
    };
  }, []);

  if (!isVisible) return null;
  return <FloatingDebuggerPanel enableNetworkTab={enableNetworkTab} />;
}

const SPRING_CONFIG = {
  damping: 25,
  mass: 1,
  stiffness: 300,
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    zIndex: 10000,
    elevation: 50,
  },
  buttonContainer: {
    width: '100%',
    height: '100%',
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: wp(2) },
    shadowOpacity: 0.25,
    shadowRadius: wp(4),
  },
  modalContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(10),
    paddingVertical: wp(6),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: wp(14),
    lineHeight: wp(18),
    fontWeight: '700',
  },
  closeButton: {
    width: wp(28),
    height: wp(28),
    borderRadius: wp(14),
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: wp(8),
  },
  tab: {
    flex: 1,
    paddingVertical: wp(8),
    alignItems: 'center',
  },
  tabText: {
    fontSize: wp(14),
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(12),
    paddingTop: wp(8),
    gap: wp(6),
  },
  searchInput: {
    flex: 1,
    height: wp(36),
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: wp(8),
    paddingHorizontal: wp(12),
    paddingVertical: Platform.OS === 'android' ? 0 : wp(8),
    backgroundColor: '#F8F9FA',
    fontSize: wp(14),
    textAlignVertical: 'center',
  },
  actionButton: {
    width: wp(50),
    height: wp(30),
    borderRadius: wp(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp(6),
  },
  clearButton: {
    width: wp(50),
    height: wp(30),
    borderRadius: wp(8),
    backgroundColor: '#DC3545',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp(6),
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: wp(14),
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: wp(12),
    paddingTop: wp(6),
    gap: wp(8),
  },
  filterSpacer: {
    flex: 1,
  },
  filterChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
    backgroundColor: '#F1F3F5',
    borderRadius: wp(16),
    paddingHorizontal: wp(10),
    paddingVertical: wp(4),
  },
  filterChipText: {
    fontSize: wp(12),
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: wp(16),
    paddingTop: wp(8),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: wp(50),
    paddingHorizontal: wp(24),
  },
  emptyText: {
    textAlign: 'center',
    color: '#999999',
    fontSize: wp(16),
  },
  logItem: {
    marginBottom: wp(12),
    padding: wp(12),
    borderRadius: wp(8),
    borderLeftWidth: wp(4),
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: wp(4),
  },
  logHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logType: {
    fontSize: wp(10),
    fontWeight: '700',
    paddingHorizontal: wp(6),
    paddingVertical: wp(2),
    borderRadius: wp(4),
  },
  timestamp: {
    fontSize: wp(12),
    color: '#666666',
    marginBottom: wp(4),
  },
  copyButton: {
    marginLeft: wp(8),
    paddingHorizontal: wp(8),
    paddingVertical: wp(4),
    borderRadius: wp(6),
    backgroundColor: '#E9ECEF',
  },
  logMessage: {
    fontSize: wp(14),
    color: '#333333',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  toggleLink: {
    fontSize: wp(12),
    color: '#007AFF',
    marginTop: wp(6),
  },
  logTone: {
    backgroundColor: '#F8F9FA',
    borderLeftColor: '#28A745',
  },
  logLabel: {
    color: '#2D6A4F',
    backgroundColor: '#D8F3DC',
  },
  infoTone: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#3B82F6',
  },
  infoLabel: {
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
  },
  warnTone: {
    backgroundColor: '#FFF7E6',
    borderLeftColor: '#F59E0B',
  },
  warnLabel: {
    color: '#B45309',
    backgroundColor: '#FDE68A',
  },
  errorTone: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#DC2626',
  },
  errorLabel: {
    color: '#B91C1C',
    backgroundColor: '#FECACA',
  },
  debugTone: {
    backgroundColor: '#F5F3FF',
    borderLeftColor: '#7C3AED',
  },
  debugLabel: {
    color: '#6D28D9',
    backgroundColor: '#E9D5FF',
  },
});

export default FloatingDebugger;
