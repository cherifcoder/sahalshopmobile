import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { articleApi } from "../api/services";
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
import { formatMoney, formatNumber } from "../utils/format";

export default function ArticlesScreen({ navigation }) {
  const [articles, setArticles] = useState([]);
  const [summary, setSummary] = useState({});
  const [query, setQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else if (articles.length === 0) setLoading(true);
    setError("");
    try {
      const response = await articleApi.list({ limit: 200 });
      setArticles(response.data || []);
      setSummary(response.summary || {});
    } catch (err) {
      setError(err.message || "Impossible de charger les articles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [articles.length]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return articles.filter((article) => {
      if (lowStockOnly && article.stock > article.alertThreshold) return false;
      if (!search) return true;
      return [article.name, article.sku, article.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search));
    });
  }, [articles, query, lowStockOnly]);

  if (loading && articles.length === 0) {
    return (
      <Screen edges={["top", "left", "right"]} scroll={false}>
        <LoadingView label="Chargement du stock…" />
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "left", "right"]} refreshing={refreshing} onRefresh={() => load(true)}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Stock & Articles</Text>
          <Text style={styles.subtitle}>
            {formatNumber(articles.length)} article(s) actif(s)
          </Text>
        </View>
        <Button
          title="Ajouter"
          icon="add"
          small
          onPress={() => navigation.navigate("ArticleForm")}
        />
      </View>

      <View style={styles.grid}>
        <StatCard
          title="Valeur du stock"
          value={formatMoney(summary.stockValue)}
          subtitle="Au prix d'achat"
          icon="cube-outline"
          tone="primary"
        />
        <StatCard
          title="Alertes"
          value={formatNumber(summary.alerts)}
          subtitle="Articles à commander"
          icon="warning-outline"
          tone={summary.alerts > 0 ? "warning" : "success"}
        />
      </View>

      <View style={styles.toolbar}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Nom, SKU, catégorie…"
        />
        <View style={styles.chips}>
          <Chip
            label="Tous"
            active={!lowStockOnly}
            onPress={() => setLowStockOnly(false)}
          />
          <Chip
            label="Stock bas"
            icon="alert-circle-outline"
            active={lowStockOnly}
            onPress={() => setLowStockOnly(true)}
          />
        </View>
      </View>

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
            icon="cube-outline"
            title={query ? "Aucun résultat" : "Aucun article"}
            message={
              query
                ? "Essayez un autre mot-clé."
                : "Ajoutez votre premier article pour commencer à vendre."
            }
            actionLabel={!query ? "Ajouter un article" : undefined}
            onAction={() => navigation.navigate("ArticleForm")}
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {filtered.map((article) => {
            const low = article.stock <= article.alertThreshold;
            return (
              <Pressable
                key={article._id}
                onPress={() =>
                  navigation.navigate("ArticleDetail", { id: article._id })
                }
                style={({ pressed }) => [styles.articleCard, pressed && styles.pressed]}
              >
                <View style={styles.articleIcon}>
                  <Text style={styles.articleInitial}>
                    {article.name?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.articleName} numberOfLines={1}>
                      {article.name}
                    </Text>
                    {low ? (
                      <Badge
                        label={article.stock === 0 ? "Rupture" : "Stock bas"}
                        variant={article.stock === 0 ? "danger" : "warning"}
                      />
                    ) : null}
                  </View>
                  <Text style={styles.articleMeta} numberOfLines={1}>
                    {article.category}
                    {article.sku ? ` • ${article.sku}` : ""}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.salePrice}>{formatMoney(article.salePrice)}</Text>
                    <Text style={styles.purchasePrice}>
                      achat {formatMoney(article.purchasePrice)}
                    </Text>
                  </View>
                </View>
                <View style={styles.stockBox}>
                  <Text
                    style={[
                      styles.stockValue,
                      { color: low ? colors.danger : colors.primary },
                    ]}
                  >
                    {formatNumber(article.stock)}
                  </Text>
                  <Text style={styles.stockLabel}>{article.unit || "unité"}</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: { fontSize: 22, fontWeight: font.heavy, color: colors.text },
  subtitle: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  grid: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  toolbar: { marginTop: spacing.xs },
  chips: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
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
  articleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pressed: { opacity: 0.8 },
  articleIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  articleInitial: { fontSize: 20, fontWeight: font.heavy, color: colors.primary },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  articleName: { fontSize: 13.5, fontWeight: font.bold, color: colors.text, flexShrink: 1 },
  articleMeta: { fontSize: 10.5, color: colors.muted, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 7, marginTop: 4 },
  salePrice: { fontSize: 12.5, fontWeight: font.bold, color: colors.primary },
  purchasePrice: { fontSize: 9.5, color: colors.muted },
  stockBox: { alignItems: "center", minWidth: 46 },
  stockValue: { fontSize: 19, fontWeight: font.heavy },
  stockLabel: { fontSize: 8.5, color: colors.muted, marginTop: -1 },
});
