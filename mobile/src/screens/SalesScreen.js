import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { saleApi } from "../api/services";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  LoadingView,
  Screen,
  SearchBar,
  StatCard,
} from "../components";
import { colors, font, radius, spacing } from "../theme";
import {
  PAYMENT_LABELS,
  formatDate,
  formatMoney,
  formatNumber,
  formatTime,
  presetRange,
  toISODate,
} from "../utils/format";

const FILTERS = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "all", label: "Tout" },
];

export default function SalesScreen({ navigation }) {
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({});
  const [filter, setFilter] = useState("today");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [invoiceId, setInvoiceId] = useState(null);

  const paramsFor = (key) => {
    if (key === "all") return {};
    if (key === "week") {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { startDate: toISODate(start), endDate: toISODate(now) };
    }
    return presetRange(key);
  };

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const response = await saleApi.list({ ...paramsFor(filter), limit: 100 });
        setSales(response.data || []);
        setSummary(response.summary || {});
      } catch (err) {
        setError(err.message || "Impossible de charger les ventes.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return sales;
    return sales.filter((sale) =>
      [sale.reference, sale.invoiceNumber, sale.customerName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search))
    );
  }, [sales, query]);

  const share = async (sale) => {
    setInvoiceId(sale._id);
    try {
      await saleApi.invoice(sale);
    } catch (err) {
      Alert.alert("Facture", err.message);
    } finally {
      setInvoiceId(null);
    }
  };

  if (loading && sales.length === 0) {
    return (
      <Screen edges={["top", "left", "right"]} scroll={false}>
        <LoadingView label="Chargement des ventes…" />
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "left", "right"]} refreshing={refreshing} onRefresh={() => load(true)}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Ventes</Text>
          <Text style={styles.subtitle}>{formatNumber(sales.length)} vente(s) affichée(s)</Text>
        </View>
        <Button
          title="Vendre"
          icon="add"
          small
          onPress={() => navigation.navigate("NewSale")}
        />
      </View>

      <View style={styles.grid}>
        <StatCard
          title="Chiffre d'affaires"
          value={formatMoney(summary.revenueCompleted ?? summary.revenue)}
          subtitle="Ventes terminées"
          icon="trending-up-outline"
          tone="primary"
        />
        <StatCard
          title="Ventes à crédit"
          value={formatMoney(summary.credit)}
          subtitle="Solde non encaissé"
          icon="time-outline"
          tone="warning"
        />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            active={filter === item.key}
            onPress={() => setFilter(item.key)}
          />
        ))}
      </View>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Référence, facture, client…"
      />

      {error ? (
        <Pressable onPress={() => load()} style={styles.errorBox}>
          <Ionicons name="warning-outline" size={17} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retry}>Réessayer</Text>
        </Pressable>
      ) : null}

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="receipt-outline"
            title={query ? "Aucun résultat" : "Aucune vente"}
            message={
              query
                ? "Essayez une autre référence."
                : "Les ventes enregistrées apparaîtront ici."
            }
            actionLabel={!query ? "Nouvelle vente" : undefined}
            onAction={() => navigation.navigate("NewSale")}
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {filtered.map((sale) => {
            const cancelled = sale.status === "cancelled";
            return (
              <Pressable
                key={sale._id}
                onPress={() => navigation.navigate("SaleDetail", { id: sale._id })}
                style={({ pressed }) => [
                  styles.saleCard,
                  cancelled && styles.saleCardCancelled,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.icon,
                    {
                      backgroundColor: cancelled
                        ? colors.dangerSoft
                        : sale.paymentType === "credit"
                        ? colors.warningSoft
                        : colors.successSoft,
                    },
                  ]}
                >
                  <Ionicons
                    name={cancelled ? "close" : sale.paymentType === "credit" ? "time-outline" : "checkmark"}
                    size={18}
                    color={
                      cancelled
                        ? colors.danger
                        : sale.paymentType === "credit"
                        ? colors.warning
                        : colors.success
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.refRow}>
                    <Text style={styles.ref}>{sale.reference}</Text>
                    {cancelled ? <Badge label="Annulée" variant="danger" /> : null}
                  </View>
                  <Text style={styles.customer} numberOfLines={1}>{sale.customerName}</Text>
                  <Text style={styles.meta}>
                    {formatDate(sale.createdAt)} • {formatTime(sale.createdAt)} •{" "}
                    {PAYMENT_LABELS[sale.paymentType]}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text style={[styles.amount, cancelled && styles.strike]}>
                    {formatMoney(sale.total)}
                  </Text>
                  {sale.balanceDue > 0 && !cancelled ? (
                    <Text style={styles.due}>reste {formatMoney(sale.balanceDue)}</Text>
                  ) : (
                    <Text style={styles.invoice}>{sale.invoiceNumber}</Text>
                  )}
                  <Pressable
                    onPress={() => share(sale)}
                    disabled={invoiceId === sale._id}
                    style={styles.invoiceBtn}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={invoiceId === sale._id ? "hourglass-outline" : "document-text-outline"}
                      size={17}
                      color={colors.primary}
                    />
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: font.heavy, color: colors.text },
  subtitle: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  grid: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
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
  saleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  saleCardCancelled: { opacity: 0.65 },
  pressed: { opacity: 0.8 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  refRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  ref: { fontSize: 11.5, fontWeight: font.bold, color: colors.primary },
  customer: { fontSize: 13, fontWeight: font.semibold, color: colors.text, marginTop: 2 },
  meta: { fontSize: 9.5, color: colors.muted, marginTop: 2 },
  right: { alignItems: "flex-end", maxWidth: 118 },
  amount: { fontSize: 13, fontWeight: font.heavy, color: colors.text },
  strike: { textDecorationLine: "line-through" },
  due: { fontSize: 9.5, color: colors.danger, marginTop: 1 },
  invoice: { fontSize: 8.5, color: colors.muted, marginTop: 1 },
  invoiceBtn: {
    marginTop: 5,
    padding: 4,
    borderRadius: 7,
    backgroundColor: colors.primaryLight,
  },
});
