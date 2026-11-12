import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { lossApi } from "../api/services";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  LoadingView,
  Screen,
  StatCard,
} from "../components";
import { colors, font, radius, spacing } from "../theme";
import { LOSS_LABELS, formatDate, formatMoney, formatNumber } from "../utils/format";

const TYPES = [
  { value: "", label: "Toutes" },
  { value: "damage", label: "Casse" },
  { value: "theft", label: "Vol" },
  { value: "expiry", label: "Péremption" },
  { value: "other", label: "Autre" },
];

export default function LossesScreen({ navigation }) {
  const [losses, setLosses] = useState([]);
  const [summary, setSummary] = useState({});
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await lossApi.list({
        limit: 150,
        ...(type ? { type } : {}),
      });
      setLosses(response.data || []);
      setSummary(response.summary || {});
    } catch (err) {
      setError(err.message || "Impossible de charger les pertes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && losses.length === 0) {
    return (
      <Screen scroll={false}>
        <LoadingView label="Chargement des pertes…" />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pertes d'articles</Text>
          <Text style={styles.subtitle}>Casse, vol, péremption…</Text>
        </View>
        <Button
          title="Déclarer"
          icon="add"
          small
          onPress={() => navigation.navigate("Main", { screen: "Stock" })}
        />
      </View>

      <StatCard
        title="Valeur totale des pertes"
        value={formatMoney(summary.totalValue)}
        subtitle={`${formatNumber(summary.count)} perte(s) enregistrée(s)`}
        icon="warning-outline"
        tone="danger"
      />

      <View style={styles.chips}>
        {TYPES.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            active={type === item.value}
            onPress={() => setType(item.value)}
          />
        ))}
      </View>

      {error ? (
        <Pressable onPress={() => load()} style={styles.errorBox}>
          <Ionicons name="warning-outline" size={17} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retry}>Réessayer</Text>
        </Pressable>
      ) : null}

      {losses.length === 0 ? (
        <Card>
          <EmptyState
            icon="shield-checkmark-outline"
            title="Aucune perte"
            message="Les pertes déclarées depuis la fiche article apparaîtront ici."
            actionLabel="Aller au stock"
            onAction={() => navigation.navigate("Main", { screen: "Stock" })}
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {losses.map((loss) => (
            <Card key={loss._id} style={styles.lossCard}>
              <View style={styles.icon}>
                <Ionicons name="warning-outline" size={19} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{loss.articleName}</Text>
                <Text style={styles.meta}>
                  {LOSS_LABELS[loss.type] || loss.type} • {formatDate(loss.date)}
                </Text>
                {loss.reason ? (
                  <Text style={styles.reason} numberOfLines={1}>{loss.reason}</Text>
                ) : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Badge label={`-${loss.quantity}`} variant="danger" />
                <Text style={styles.value}>{formatMoney(loss.totalCost)}</Text>
                <Text style={styles.unit}>{formatMoney(loss.unitCost)} / unité</Text>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: font.heavy, color: colors.text },
  subtitle: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginVertical: spacing.md },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 11.5 },
  retry: { color: colors.danger, fontWeight: font.bold, fontSize: 11.5 },
  lossCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 13, fontWeight: font.bold, color: colors.text },
  meta: { fontSize: 10, color: colors.muted, marginTop: 2 },
  reason: { fontSize: 9.5, color: colors.textSoft, marginTop: 1, fontStyle: "italic" },
  value: { fontSize: 12, fontWeight: font.heavy, color: colors.danger, marginTop: 4 },
  unit: { fontSize: 8.5, color: colors.muted, marginTop: 1 },
});
