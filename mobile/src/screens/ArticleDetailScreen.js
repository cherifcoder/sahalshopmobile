import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useLayoutEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { articleApi, lossApi } from "../api/services";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingView,
  ModalSheet,
  Screen,
  SectionHeader,
  Select,
  StatCard,
} from "../components";
import { colors, font, radius, spacing } from "../theme";
import { articleImageUri } from "../utils/articleImage";
import { LOSS_LABELS, formatDate, formatMoney, formatNumber } from "../utils/format";

const MOVEMENT_LABELS = {
  initial: "Stock initial",
  adjustment_in: "Entrée manuelle",
  adjustment_out: "Sortie manuelle",
  sale: "Vente",
  loss: "Perte",
  return: "Retour",
  sale_cancel: "Annulation de vente",
};

const LOSS_OPTIONS = Object.entries(LOSS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function ArticleDetailScreen({ navigation, route }) {
  const id = route.params?.id;
  const [article, setArticle] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [stockOpen, setStockOpen] = useState(false);
  const [stockMode, setStockMode] = useState("in");
  const [stockQty, setStockQty] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [savingStock, setSavingStock] = useState(false);

  const [lossOpen, setLossOpen] = useState(false);
  const [lossQty, setLossQty] = useState("");
  const [lossType, setLossType] = useState("damage");
  const [lossReason, setLossReason] = useState("");
  const [savingLoss, setSavingLoss] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: article?.name || "Article",
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate("ArticleForm", { id })}
          hitSlop={10}
          style={{ marginRight: 4 }}
        >
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, article?.name, id]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const response = await articleApi.get(id);
        setArticle(response.article);
        setMovements(response.movements || []);
      } catch (err) {
        setError(err.message || "Impossible de charger l'article.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openStock = (mode) => {
    setStockMode(mode);
    setStockQty("");
    setStockReason("");
    setStockOpen(true);
  };

  const submitStock = async () => {
    const qty = Number(stockQty);
    if (stockQty === "" || !Number.isFinite(qty) || qty < 0) {
      Alert.alert("Quantité invalide", "Saisissez une quantité positive.");
      return;
    }
    setSavingStock(true);
    try {
      await articleApi.adjustStock(id, {
        mode: stockMode,
        quantity: qty,
        reason: stockReason.trim() || "Ajustement manuel",
      });
      setStockOpen(false);
      await load();
      Alert.alert("Stock mis à jour", "Le mouvement a été enregistré.");
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setSavingStock(false);
    }
  };

  const submitLoss = async () => {
    const qty = Number(lossQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      Alert.alert("Quantité invalide", "Saisissez un entier supérieur à zéro.");
      return;
    }
    setSavingLoss(true);
    try {
      const response = await lossApi.create({
        articleId: id,
        quantity: qty,
        type: lossType,
        reason: lossReason.trim(),
      });
      setLossOpen(false);
      await load();
      Alert.alert(
        "Perte enregistrée",
        `Valeur de la perte : ${formatMoney(response.loss?.totalCost)}. Le stock a été diminué.`
      );
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setSavingLoss(false);
    }
  };

  const confirmArchive = () => {
    Alert.alert(
      "Archiver cet article ?",
      "Il ne sera plus proposé à la vente.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Archiver",
          style: "destructive",
          onPress: async () => {
            try {
              await articleApi.remove(id);
              navigation.goBack();
            } catch (err) {
              Alert.alert("Erreur", err.message);
            }
          },
        },
      ]
    );
  };

  if (loading && !article) {
    return (
      <Screen scroll={false}>
        <LoadingView label="Chargement de l'article…" />
      </Screen>
    );
  }

  if (!article) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle-outline"
          title="Article introuvable"
          message={error}
          actionLabel="Réessayer"
          onAction={() => load()}
        />
      </Screen>
    );
  }

  const low = article.stock <= article.alertThreshold;
  const margin = article.salePrice - article.purchasePrice;
  const fullImage = articleImageUri(article, "full");

  return (
    <>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        {fullImage ? (
          <View style={styles.detailImageCard}>
            <Image source={{ uri: fullImage }} style={styles.detailImage} resizeMode="cover" />
          </View>
        ) : null}
        <Card style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.icon}>
              <Text style={styles.iconText}>{article.name?.[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{article.name}</Text>
              <Text style={styles.meta}>
                {article.category}
                {article.sku ? ` • ${article.sku}` : ""}
              </Text>
              <View style={{ flexDirection: "row", gap: 5, marginTop: 6 }}>
                <Badge
                  label={article.active ? "Actif" : "Archivé"}
                  variant={article.active ? "success" : "default"}
                />
                {low ? (
                  <Badge
                    label={article.stock === 0 ? "Rupture" : "Stock bas"}
                    variant={article.stock === 0 ? "danger" : "warning"}
                  />
                ) : null}
              </View>
            </View>
          </View>
          <View style={styles.stockHero}>
            <View>
              <Text style={styles.stockLabel}>STOCK DISPONIBLE</Text>
              <Text style={[styles.stockValue, low && { color: colors.danger }]}>
                {formatNumber(article.stock)}{" "}
                <Text style={styles.stockUnit}>{article.unit || "unité"}</Text>
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.stockLabel}>SEUIL D'ALERTE</Text>
              <Text style={styles.threshold}>{formatNumber(article.alertThreshold)}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.grid}>
          <StatCard
            title="Prix d'achat"
            value={formatMoney(article.purchasePrice)}
            icon="download-outline"
            tone="info"
          />
          <StatCard
            title="Prix de vente"
            value={formatMoney(article.salePrice)}
            icon="pricetag-outline"
            tone="primary"
          />
        </View>
        <View style={[styles.grid, { marginTop: spacing.sm }]}>
          <StatCard
            title="Marge unitaire"
            value={formatMoney(margin)}
            subtitle={
              article.purchasePrice > 0
                ? `${Math.round((margin / article.purchasePrice) * 100)}%`
                : undefined
            }
            icon="trending-up-outline"
            tone={margin < 0 ? "danger" : "success"}
          />
          <StatCard
            title="Valeur en stock"
            value={formatMoney(article.stock * article.purchasePrice)}
            icon="layers-outline"
            tone="gold"
          />
        </View>

        <SectionHeader title="Actions sur le stock" />
        <View style={styles.actions}>
          <Button
            title="Entrée"
            icon="add-circle-outline"
            variant="secondary"
            small
            onPress={() => openStock("in")}
            style={{ flex: 1 }}
          />
          <Button
            title="Sortie"
            icon="remove-circle-outline"
            variant="outline"
            small
            onPress={() => openStock("out")}
            style={{ flex: 1 }}
          />
          <Button
            title="Définir"
            icon="options-outline"
            variant="ghost"
            small
            onPress={() => openStock("set")}
            style={{ flex: 1 }}
          />
        </View>
        <Button
          title="Déclarer une perte"
          icon="warning-outline"
          variant="danger"
          onPress={() => {
            setLossQty("");
            setLossType("damage");
            setLossReason("");
            setLossOpen(true);
          }}
          style={{ marginTop: spacing.sm }}
        />

        {article.description ? (
          <>
            <SectionHeader title="Description" />
            <Card>
              <Text style={styles.description}>{article.description}</Text>
            </Card>
          </>
        ) : null}

        <SectionHeader title="Mouvements récents" subtitle="30 derniers mouvements" />
        <Card>
          {movements.length === 0 ? (
            <EmptyState icon="swap-vertical-outline" title="Aucun mouvement" />
          ) : (
            movements.map((movement, index) => {
              const incoming = movement.quantity > 0;
              return (
                <View
                  key={movement._id}
                  style={[styles.movement, index > 0 && styles.rowBorder]}
                >
                  <View
                    style={[
                      styles.movementIcon,
                      { backgroundColor: incoming ? colors.successSoft : colors.dangerSoft },
                    ]}
                  >
                    <Ionicons
                      name={incoming ? "arrow-down" : "arrow-up"}
                      size={15}
                      color={incoming ? colors.success : colors.danger}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.movementTitle}>
                      {MOVEMENT_LABELS[movement.type] || movement.type}
                    </Text>
                    <Text style={styles.movementMeta} numberOfLines={1}>
                      {formatDate(movement.createdAt, true)}
                      {movement.reason ? ` • ${movement.reason}` : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={[
                        styles.movementQty,
                        { color: incoming ? colors.success : colors.danger },
                      ]}
                    >
                      {incoming ? "+" : ""}
                      {movement.quantity}
                    </Text>
                    <Text style={styles.movementStock}>→ {movement.newStock}</Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        <Button
          title="Modifier l'article"
          icon="create-outline"
          variant="secondary"
          onPress={() => navigation.navigate("ArticleForm", { id })}
          style={{ marginTop: spacing.lg }}
        />
        <Button
          title="Archiver l'article"
          icon="trash-outline"
          variant="ghost"
          onPress={confirmArchive}
          style={{ marginTop: spacing.sm }}
        />
      </Screen>

      {/* Ajustement de stock */}
      <ModalSheet
        visible={stockOpen}
        onClose={() => setStockOpen(false)}
        title={
          stockMode === "in"
            ? "Ajouter du stock"
            : stockMode === "out"
            ? "Retirer du stock"
            : "Définir le stock"
        }
        footer={
          <Button
            title="Valider le mouvement"
            icon="checkmark-circle-outline"
            onPress={submitStock}
            loading={savingStock}
          />
        }
      >
        <Text style={styles.modalInfo}>
          Stock actuel : <Text style={styles.bold}>{article.stock}</Text>{" "}
          {article.unit || "unité(s)"}.
        </Text>
        <Input
          label={stockMode === "set" ? "Nouveau stock" : "Quantité"}
          value={stockQty}
          onChangeText={setStockQty}
          placeholder="0"
          keyboardType="numeric"
          icon="cube-outline"
        />
        <Input
          label="Motif"
          value={stockReason}
          onChangeText={setStockReason}
          placeholder="Ex. réapprovisionnement, inventaire…"
          icon="document-text-outline"
          autoCapitalize="sentences"
        />
      </ModalSheet>

      {/* Perte */}
      <ModalSheet
        visible={lossOpen}
        onClose={() => setLossOpen(false)}
        title="Déclarer une perte"
        footer={
          <Button
            title="Enregistrer la perte"
            icon="warning-outline"
            variant="danger"
            onPress={submitLoss}
            loading={savingLoss}
          />
        }
      >
        <Text style={styles.modalInfo}>
          Le stock sera diminué et la perte valorisée au prix d'achat
          {" "}({formatMoney(article.purchasePrice)} / unité).
        </Text>
        <Input
          label="Quantité perdue"
          value={lossQty}
          onChangeText={setLossQty}
          placeholder="0"
          keyboardType="numeric"
          icon="cube-outline"
        />
        <Select
          label="Type de perte"
          value={lossType}
          options={LOSS_OPTIONS}
          onChange={setLossType}
          icon="alert-circle-outline"
        />
        <Input
          label="Précisions"
          value={lossReason}
          onChangeText={setLossReason}
          placeholder="Circonstances, responsable…"
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
        />
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  detailImageCard: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  detailImage: { width: "100%", height: 230 },
  hero: { backgroundColor: colors.surface },
  heroTop: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 24, fontWeight: font.heavy, color: colors.primary },
  name: { fontSize: 18, fontWeight: font.heavy, color: colors.text },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  stockHero: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  stockLabel: { fontSize: 8.5, color: colors.primaryMid, fontWeight: font.bold, letterSpacing: 0.5 },
  stockValue: { fontSize: 27, fontWeight: font.heavy, color: colors.primary, marginTop: 1 },
  stockUnit: { fontSize: 12, fontWeight: font.medium },
  threshold: { fontSize: 18, fontWeight: font.bold, color: colors.textSoft, marginTop: 1 },
  grid: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  actions: { flexDirection: "row", gap: spacing.sm },
  description: { fontSize: 12.5, color: colors.textSoft, lineHeight: 19 },
  movement: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 9 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  movementIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  movementTitle: { fontSize: 12, fontWeight: font.semibold, color: colors.text },
  movementMeta: { fontSize: 9.5, color: colors.muted, marginTop: 1 },
  movementQty: { fontSize: 12.5, fontWeight: font.bold },
  movementStock: { fontSize: 9, color: colors.muted },
  modalInfo: { fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: spacing.md },
  bold: { fontWeight: font.bold, color: colors.text },
});
