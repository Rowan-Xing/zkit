import { useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { wp } from "y2kit-tools";
import { Button, ComponentLibProvider, Switch, useTheme } from "y2kit-ui";

function DemoScreen() {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(0);
  const safeCount = Math.min(Math.max(count, 0), 9);

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.content}>
        <View>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            y2kit-ui
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            React Native UI package playground
          </Text>
        </View>

        <View style={[styles.panel, { borderColor: theme.colors.border }]}>
          <View style={styles.row}>
            <View>
              <Text style={[styles.label, { color: theme.colors.onSurface }]}>
                Switch
              </Text>
              <Text
                style={[styles.meta, { color: theme.colors.muted }]}
              >{`value: ${enabled ? "on" : "off"}`}</Text>
            </View>
            <Switch value={enabled} onValueChange={setEnabled} />
          </View>

          <View style={styles.actions}>
            <Button onPress={() => setCount((value) => value + 1)}>
              Count {safeCount}
            </Button>
            <Button
              onPress={() => setCount(0)}
              variant="outline"
            >
              Reset
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ComponentLibProvider>
      <DemoScreen />
    </ComponentLibProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  content: {
    flex: 1,
    gap: 24,
    justifyContent: "center",
    padding: wp(24)
  },
  title: {
    fontSize: 34,
    fontWeight: "700"
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8
  },
  panel: {
    borderRadius: wp(12),
    borderWidth: StyleSheet.hairlineWidth,
    gap: 24,
    padding: wp(20)
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    fontSize: 17,
    fontWeight: "600"
  },
  meta: {
    fontSize: 13,
    marginTop: 4
  },
  actions: {
    flexDirection: "row",
    gap: 12
  }
});
