import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { dashboardApi } from "../api/services";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  LoadingView,
  Logo,
  ModalSheet,
  Screen,
  SectionHeader,
  StatCard,
} from "../components";
import { useAuth } from "../context/AuthContext";
import { colors, font, radius, shadows, spacing } from "../theme";
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatTime,
  presetRange,
  todayISO,
} from "../utils/format";

const PERIODS = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
  { key: "custom", label: "Personnalisé", icon: "calendar-outline" },
];

const PERIOD_LABEL = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
  custom: "Période personnalisée",
};

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState("today");
  const [filter, setFilter] = useState(presetRange("today"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(presetRange("month").startDate);
  const [customEnd, setCustomEnd] = useState(todayISO());

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const response = await dashboardApi.get(filter);
        setData(response);
      } catch (err) {
        setError(err.message || "Impossible de charger le tableau de bord.");
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

  const selectPeriod = (key) => {
    if (key === "custom") {
      setCustomOpen(true);
      return;
    }
    setPeriod(key);
    setFilter(presetRange(key));
  };

  const applyCustom = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(customStart) || !/^\d{4}-\d{2}-\d{2}$/.test(customEnd)) {
      setError("Utilisez le format AAAA-MM-JJ pour les deux dates.");
      return;
    }
    if (customStart > customEnd) {
      setError("La date de début doit précéder la date de fin.");
      return;
    }
    setPeriod("custom");
    setFilter({ startDate: customStart, endDate: customEnd });
    setCustomOpen(false);
    setError("");
  };

  if (loading && !data) {
    return (
      <Screen edges={["top", "left", "right"]} scroll={false}>
        <LoadingView label="Chargement du tableau de bord…" />
      </Screen>
    );
  }

  const periods = data?.periods || {};
  const current = periods.custom || periods.today || {};
  const finance = data?.finance || {};
  const series = data?.salesSeries || [];
  const maxSeries = Math.max(...series.map((entry) => entry.revenue || 0), 1);
  const topProducts = data?.topProducts || [];
  const maxProductRevenue = Math.max(...topProducts.map((entry) => entry.revenue || 0), 1);
  const lowStock = data?.lowStock || [];
  const recentSales = data?.recentSales || [];
  const shop = data?.shop || {};
  const greeting =
    new Date().getHours() < 12
      ? "Bonjour"
      : new Date().getHours() < 18
      ? "Bon après-midi"
      : "Bonsoir";

  return (
    <>
      <Screen edges={["top", "left", "right"]} refreshing={refreshing} onRefresh={() => load(true)}>
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Logo size={41} rounded />
            <View style={{ flex: 1 }}>
              <Text style={styles.brandName}>{shop.name || "SAHAL SHOP"}</Text>
              <Text style={styles.welcome}>
                {greeting}, {user?.name?.split(" ")[0] || "Bienvenue"} 👋
              </Text>
            </View>
            <Pressable onPress={() => navigation.navigate("Profile")}>
              <Avatar name={user?.name} size={40} />
            </Pressable>
          </View>
        </View>

        {error ? (
          <Pressable onPress={() => load()} style={styles.errorBox}>
            <Ionicons name="warning-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retry}>Réessayer</Text>
          </Pressable>
        ) : null}

        {/* Périodes */}
        <View style={styles.periods}>
          {PERIODS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              icon={item.icon}
              active={period === item.key}
              onPress={() => selectPeriod(item.key)}
            />
          ))}
        </View>

        {/* Carte principale */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>
              CHIFFRE D'AFFAIRES NET • {PERIOD_LABEL[period]?.toUpperCase()}
            </Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN DIRECT</Text>
            </View>
          </View>
          <Text style={styles.heroValue}>{formatMoney(current.revenue)}</Text>
          <Text style={styles.heroSub}>
            {formatNumber(current.salesCount)} vente(s) • Bénéfice net{" "}
            <Text style={styles.heroProfit}>{formatMoney(current.netProfit)}</Text>
          </Text>
          <View style={styles.heroDivider} />
          <View style={styles.heroFooter}>
            <View>
              <Text style={styles.heroSmallLabel}>Encaissé</Text>
              <Text style={styles.heroSmallValue}>{formatMoney(current.cashCollected)}</Text>
            </View>
            <View>
              <Text style={styles.heroSmallLabel}>Ventes à crédit</Text>
              <Text style={styles.heroSmallValue}>{formatMoney(current.creditExtended)}</Text>
            </View>
            <View>
              <Text style={styles.heroSmallLabel}>Marge brute</Text>
              <Text style={styles.heroSmallValue}>{current.grossMarginRate || 0}%</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Actions rapides */}
        <View style={styles.quickActions}>
          <Button
            title="Nouvelle vente"
            icon="cart-outline"
            onPress={() => navigation.navigate("NewSale")}
            style={{ flex: 1 }}
          />
          <Button
            title="Article"
            icon="add"
            variant="secondary"
            onPress={() => navigation.navigate("ArticleForm")}
            style={{ flex: 1 }}
          />
        </View>

        {/* Indicateurs financiers */}
        <SectionHeader title="Indicateurs financiers" subtitle={PERIOD_LABEL[period]} />
        <View style={styles.grid}>
          <StatCard
            title="Bénéfice brut"
            value={formatMoney(finance.grossProfit)}
            subtitle="CA - coût d'achat"
            icon="trending-up-outline"
            tone="success"
          />
          <StatCard
            title="Bénéfice net"
            value={formatMoney(finance.netProfit)}
            subtitle="Après dépenses & pertes"
            icon="wallet-outline"
            tone="primary"
          />
        </View>
        <View style={[styles.grid, { marginTop: spacing.sm }]}>
          <StatCard
            title="Dépenses nettes"
            value={formatMoney(finance.totalExpenses)}
            subtitle={`${current.expenseCount || 0} dépense(s)`}
            icon="receipt-outline"
            tone="danger"
          />
          <StatCard
            title="Pertes"
            value={formatMoney(finance.totalLosses)}
            subtitle="Casse, vol, péremption"
            icon="warning-outline"
            tone="warning"
          />
        </View>
        <View style={[styles.grid, { marginTop: spacing.sm }]}>
          <StatCard
            title="Créances clients"
            value={formatMoney(finance.totalReceivables)}
            subtitle={`${finance.debtors || 0} client(s) débiteur(s)`}
            icon="people-outline"
            tone="gold"
            onPress={() => navigation.navigate("Clients")}
          />
          <StatCard
            title="Valeur du stock"
            value={formatMoney(finance.stockValue)}
            subtitle={`${formatNumber(finance.stockUnits)} unités`}
            icon="cube-outline"
            tone="info"
            onPress={() => navigation.navigate("Stock")}
          />
        </View>

        {/* Ventes par période */}
        <SectionHeader title="Ventes par période" subtitle="Comparaison rapide" />
        <View style={styles.periodCards}>
          {["today", "week", "month", "year"].map((key) => {
            const stats = periods[key] || {};
            const active = period === key;
            return (
              <Pressable
                key={key}
                onPress={() => selectPeriod(key)}
                style={[styles.periodCard, active && styles.periodCardActive]}
              >
                <Text style={[styles.periodCardLabel, active && styles.periodCardLabelActive]}>
                  {PERIOD_LABEL[key]}
                </Text>
                <Text style={[styles.periodCardValue, active && styles.periodCardValueActive]}>
                  {formatMoney(stats.revenue)}
                </Text>
                <Text style={[styles.periodCardSub, active && styles.periodCardSubActive]}>
                  {formatNumber(stats.salesCount)} vente(s)
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Graphique */}
        {series.length > 0 ? (
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Évolution des ventes</Text>
                <Text style={styles.chartSubtitle}>{PERIOD_LABEL[period]}</Text>
              </View>
              <Badge label={`${formatNumber(current.salesCount)} ventes`} variant="primary" />
            </View>
            <View style={styles.chart}>
              {series.slice(-14).map((entry) => {
                const height = Math.max(6, (entry.revenue / maxSeries) * 92);
                return (
                  <View key={entry._id} style={styles.barSlot}>
                    <Text style={styles.barValue}>
                      {entry.revenue > maxSeries * 0.55 ? formatNumber(entry.revenue) : ""}
                    </Text>
                    <View style={[styles.bar, { height }]} />
                    <Text style={styles.barLabel}>
                      {entry._id.length > 7 ? entry._id.slice(5) : entry._id}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        ) : null}

        {/* Top produits */}
        <SectionHeader
          title="Meilleures ventes"
          subtitle="Produits les plus rentables de la période"
          actionLabel="Stock"
          onAction={() => navigation.navigate("Stock")}
        />
        <Card>
          {topProducts.length === 0 ? (
            <EmptyState
              icon="bag-handle-outline"
              title="Aucune vente sur la période"
              message="Les produits vendus apparaîtront ici."
            />
          ) : (
            topProducts.map((product, index) => (
              <View
                key={String(product._id)}
                style={[styles.productRow, index > 0 && styles.rowBorder]}
              >
                <View style={styles.rank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <View style={styles.productBarTrack}>
                    <View
                      style={[
                        styles.productBar,
                        { width: `${Math.max((product.revenue / maxProductRevenue) * 100, 4)}%` },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.productNumbers}>
                  <Text style={styles.productRevenue}>{formatMoney(product.revenue)}</Text>
                  <Text style={styles.productQty}>{formatNumber(product.quantity)} vendu(s)</Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Alertes stock */}
        <SectionHeader
          title="Alertes de stock"
          subtitle="Articles à réapprovisionner"
          actionLabel="Voir tout"
          onAction={() => navigation.navigate("Stock")}
        />
        <Card>
          {lowStock.length === 0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="Stock au complet"
              message="Aucun article sous le seuil d'alerte."
            />
          ) : (
            lowStock.slice(0, 5).map((article, index) => (
              <Pressable
                key={article._id}
                onPress={() => navigation.navigate("ArticleDetail", { id: article._id })}
                style={[styles.stockRow, index > 0 && styles.rowBorder]}
              >
                <View style={styles.stockIcon}>
                  <Ionicons name="cube-outline" size={17} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stockName} numberOfLines={1}>{article.name}</Text>
                  <Text style={styles.stockMeta}>
                    Seuil : {article.alertThreshold} {article.unit || "pièce(s)"}
                  </Text>
                </View>
                <Badge
                  label={`${article.stock} restant(s)`}
                  variant={article.stock === 0 ? "danger" : "warning"}
                />
              </Pressable>
            ))
          )}
        </Card>

        {/* Dernières ventes */}
        <SectionHeader
          title="Dernières ventes"
          actionLabel="Tout voir"
          onAction={() => navigation.navigate("Sales")}
        />
        <Card>
          {recentSales.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="Aucune vente"
              message="Enregistrez votre première vente."
              actionLabel="Nouvelle vente"
              onAction={() => navigation.navigate("NewSale")}
            />
          ) : (
            recentSales.map((sale, index) => (
              <Pressable
                key={sale._id}
                onPress={() => navigation.navigate("SaleDetail", { id: sale._id })}
                style={[styles.saleRow, index > 0 && styles.rowBorder]}
              >
                <View
                  style={[
                    styles.saleIcon,
                    {
                      backgroundColor:
                        sale.paymentType === "credit" ? colors.warningSoft : colors.successSoft,
                    },
                  ]}
                >
                  <Ionicons
                    name={sale.paymentType === "credit" ? "time-outline" : "checkmark"}
                    size={17}
                    color={sale.paymentType === "credit" ? colors.warning : colors.success}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.saleCustomer} numberOfLines={1}>
                    {sale.customerName}
                  </Text>
                  <Text style={styles.saleMeta}>
                    {sale.reference} • {formatTime(sale.createdAt)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.saleAmount}>{formatMoney(sale.total)}</Text>
                  <Text style={styles.saleMeta}>
                    {sale.paymentType === "credit" ? "À crédit" : "Comptant"}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>

        <Text style={styles.updated}>
          Dernière mise à jour : {formatDate(data?.generatedAt, true)}
        </Text>
      </Screen>

      <ModalSheet
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Période personnalisée"
        footer={<Button title="Appliquer le filtre" icon="funnel-outline" onPress={applyCustom} />}
      >
        <Input
          label="Date de début"
          value={customStart}
          onChangeText={setCustomStart}
          placeholder="AAAA-MM-JJ"
          icon="calendar-outline"
          keyboardType="numbers-and-punctuation"
        />
        <Input
          label="Date de fin"
          value={customEnd}
          onChangeText={setCustomEnd}
          placeholder="AAAA-MM-JJ"
          icon="calendar-outline"
          keyboardType="numbers-and-punctuation"
        />
        <Text style={styles.customHint}>
          Exemple : du 01/11/2026 au 12/11/2026 (dates incluses).
        </Text>
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  brandName: {
    fontSize: 15,
    fontWeight: font.heavy,
    color: colors.primary,
    letterSpacing: 1,
  },
  welcome: { fontSize: 12, color: colors.muted, marginTop: 1 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: { flex: 1, fontSize: 11.5, color: colors.danger },
  retry: { fontSize: 11.5, fontWeight: font.bold, color: colors.danger },
  periods: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.floating,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  heroLabel: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 9,
    fontWeight: font.semibold,
    letterSpacing: 0.8,
    flex: 1,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  liveText: { color: "#BBF7D0", fontSize: 8, fontWeight: font.bold, letterSpacing: 0.6 },
  heroValue: {
    color: colors.white,
    fontSize: 33,
    fontWeight: font.heavy,
    marginTop: 10,
    letterSpacing: -0.5,
  },
  heroSub: { color: "rgba(255,255,255,0.7)", fontSize: 11.5, marginTop: 5 },
  heroProfit: { color: "#FDE68A", fontWeight: font.bold },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginVertical: spacing.md,
  },
  heroFooter: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  heroSmallLabel: { color: "rgba(255,255,255,0.58)", fontSize: 9.5 },
  heroSmallValue: {
    color: colors.white,
    fontSize: 12.5,
    fontWeight: font.bold,
    marginTop: 2,
  },
  quickActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  grid: { flexDirection: "row", gap: spacing.sm },
  periodCards: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  periodCard: {
    width: "48.5%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  periodCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodCardLabel: { fontSize: 10.5, color: colors.muted, fontWeight: font.medium },
  periodCardLabelActive: { color: "rgba(255,255,255,0.7)" },
  periodCardValue: {
    fontSize: 14,
    fontWeight: font.bold,
    color: colors.text,
    marginTop: 3,
  },
  periodCardValueActive: { color: colors.white },
  periodCardSub: { fontSize: 10, color: colors.muted, marginTop: 2 },
  periodCardSubActive: { color: "rgba(255,255,255,0.6)" },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  chartTitle: { fontSize: 13.5, fontWeight: font.bold, color: colors.text },
  chartSubtitle: { fontSize: 10.5, color: colors.muted, marginTop: 1 },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 132,
    gap: 4,
  },
  barSlot: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: {
    width: "72%",
    maxWidth: 20,
    backgroundColor: colors.primaryMid,
    borderRadius: 4,
  },
  barValue: { fontSize: 7.5, color: colors.muted, marginBottom: 2 },
  barLabel: { fontSize: 7.5, color: colors.muted, marginTop: 4 },
  productRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 9 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rank: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 11, fontWeight: font.bold, color: colors.primary },
  productName: { fontSize: 12.5, fontWeight: font.semibold, color: colors.text },
  productBarTrack: {
    height: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 2,
    marginTop: 5,
    overflow: "hidden",
  },
  productBar: { height: 4, backgroundColor: colors.accent, borderRadius: 2 },
  productNumbers: { alignItems: "flex-end", minWidth: 88 },
  productRevenue: { fontSize: 11.5, fontWeight: font.bold, color: colors.text },
  productQty: { fontSize: 9.5, color: colors.muted, marginTop: 1 },
  stockRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 9 },
  stockIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.warningSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  stockName: { fontSize: 12.5, fontWeight: font.semibold, color: colors.text },
  stockMeta: { fontSize: 10, color: colors.muted, marginTop: 1 },
  saleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 9 },
  saleIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  saleCustomer: { fontSize: 12.5, fontWeight: font.semibold, color: colors.text },
  saleMeta: { fontSize: 10, color: colors.muted, marginTop: 1 },
  saleAmount: { fontSize: 12.5, fontWeight: font.bold, color: colors.text },
  updated: {
    textAlign: "center",
    fontSize: 9.5,
    color: colors.muted,
    marginTop: spacing.lg,
  },
  customHint: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
