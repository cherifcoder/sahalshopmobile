import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useLayoutEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { saleApi } from "../api/services";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingView,
  ModalSheet,
  Screen,
  SectionHeader,
} from "../components";
import { useAuth } from "../context/AuthContext";
import { colors, font, radius, spacing } from "../theme";
import { PAYMENT_LABELS, formatDate, formatMoney, formatNumber, formatTime } from "../utils/format";

export default function SaleDetailScreen({ navigation, route }) {
  const id = route.params?.id;
  const { isAdmin } = useAuth();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: sale?.invoiceNumber || "Vente",
      headerRight: () =>
        sale ? (
          <Pressable
            onPress={share}
            disabled={sharing}
            hitSlop={10}
            style={{ marginRight: 4 }}
          >
            <Ionicons
              name={sharing ? "hourglass-outline" : "share-outline"}
              size={21}
              color={colors.primary}
            />
          </Pressable>
        ) : null,
    });
  }, [navigation, sale, sharing]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const response = await saleApi.get(id);
        setSale(response.sale);
      } catch (err) {
        setError(err.message || "Impossible de charger la vente.");
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

  async function share() {
    if (!sale || sharing) return;
    setSharing(true);
    try {
      await saleApi.invoice(sale);
    } catch (err) {
      Alert.alert("Facture", err.message);
    } finally {
      setSharing(false);
    }
  }

  const cancelSale = async () => {
    setCancelling(true);
    try {
      await saleApi.cancel(id, cancelReason.trim());
      setCancelOpen(false);
      await load();
      Alert.alert("Vente annulée", "Le stock a été restauré et la dette client ajustée.");
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading && !sale) {
    return (
      <Screen scroll={false}>
        <LoadingView label="Chargement de la facture…" />
      </Screen>
    );
  }

  if (!sale) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle-outline"
          title="Vente introuvable"
          message={error}
          actionLabel="Réessayer"
          onAction={() => load()}
        />
      </Screen>
    );
  }

  const cancelled = sale.status === "cancelled";

  return (
    <>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        <Card style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.invoiceIcon}>
              <Ionicons name="receipt-outline" size={25} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.invoiceLabel}>FACTURE</Text>
              <Text style={styles.invoiceNumber}>{sale.invoiceNumber}</Text>
              <Text style={styles.reference}>{sale.reference}</Text>
            </View>
            <Badge
              label={cancelled ? "Annulée" : sale.paymentStatus === "paid" ? "Payée" : sale.paymentStatus === "partial" ? "Partielle" : "Impayée"}
              variant={cancelled ? "danger" : sale.paymentStatus === "paid" ? "success" : "warning"}
            />
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.dateText}>
              {formatDate(sale.createdAt, true)} • {formatTime(sale.createdAt)}
            </Text>
            <Badge
              label={PAYMENT_LABELS[sale.paymentType]}
              variant={sale.paymentType === "credit" ? "warning" : "primary"}
            />
          </View>
        </Card>

        <Button
          title="Partager la facture PDF"
          icon="download-outline"
          onPress={share}
          loading={sharing}
          style={{ marginTop: spacing.md }}
        />

        <SectionHeader title="Client" />
        <Pressable
          onPress={() =>
            sale.customer
              ? navigation.navigate("CustomerDetail", { id: sale.customer._id })
              : null
          }
          style={styles.customerCard}
        >
          <Avatar name={sale.customerName || "Client de passage"} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{sale.customerName || "Client de passage"}</Text>
            <Text style={styles.customerMeta}>
              {sale.customer?.phone || "Vente sans compte client"}
            </Text>
          </View>
          {sale.customer ? (
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          ) : null}
        </Pressable>

        <SectionHeader title="Articles" subtitle={`${sale.items.length} ligne(s)`} />
        <Card>
          {sale.items.map((item, index) => (
            <View key={`${item.article}-${index}`} style={[styles.item, index > 0 && styles.rowBorder]}>
              <View style={styles.itemQty}>
                <Text style={styles.itemQtyText}>{item.quantity}×</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemMeta}>{formatMoney(item.unitPrice)} / unité</Text>
              </View>
              <Text style={styles.itemTotal}>{formatMoney(item.lineTotal)}</Text>
            </View>
          ))}
        </Card>

        <SectionHeader title="Paiement" />
        <Card>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sous-total</Text>
            <Text style={styles.summaryValue}>{formatMoney(sale.subtotal)}</Text>
          </View>
          {sale.discount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Remise</Text>
              <Text style={[styles.summaryValue, { color: colors.danger }]}>
                - {formatMoney(sale.discount)}
              </Text>
            </View>
          ) : null}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatMoney(sale.total)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Montant réglé</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatMoney(sale.amountPaid)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Reste à payer</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: sale.balanceDue > 0 ? colors.danger : colors.success },
              ]}
            >
              {formatMoney(sale.balanceDue)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bénéfice brut</Text>
            <Text style={styles.summaryValue}>{formatMoney(sale.grossProfit)}</Text>
          </View>
          {sale.note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Note</Text>
              <Text style={styles.noteText}>{sale.note}</Text>
            </View>
          ) : null}
        </Card>

        {cancelled ? (
          <View style={styles.cancelInfo}>
            <Ionicons name="close-circle" size={20} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelTitle}>Vente annulée</Text>
              <Text style={styles.cancelText}>
                {formatDate(sale.cancelledAt, true)}
                {sale.cancelReason ? ` • ${sale.cancelReason}` : ""}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            title="Facture PDF"
            icon="document-text-outline"
            variant="secondary"
            onPress={share}
            loading={sharing}
            style={{ flex: 1 }}
          />
          {isAdmin && !cancelled ? (
            <Button
              title="Annuler"
              icon="close-circle-outline"
              variant="danger"
              onPress={() => {
                setCancelReason("");
                setCancelOpen(true);
              }}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>

        <Text style={styles.footer}>
          Facture générée automatiquement par SAHAL SHOP.
        </Text>
      </Screen>

      <ModalSheet
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Annuler cette vente ?"
        footer={
          <Button
            title="Confirmer l'annulation"
            icon="close-circle-outline"
            variant="danger"
            onPress={cancelSale}
            loading={cancelling}
          />
        }
      >
        <Text style={styles.cancelModalText}>
          Le stock des articles sera restauré. Si la vente était à crédit, la dette
          restante du client sera diminuée en conséquence.
        </Text>
        <Input
          label="Motif (optionnel)"
          value={cancelReason}
          onChangeText={setCancelReason}
          placeholder="Ex. erreur de saisie"
          autoCapitalize="sentences"
        />
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  headerCard: { backgroundColor: colors.surface },
  headerTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  invoiceIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  invoiceLabel: { fontSize: 8.5, color: colors.muted, fontWeight: font.bold, letterSpacing: 0.7 },
  invoiceNumber: { fontSize: 17, fontWeight: font.heavy, color: colors.text, marginTop: 1 },
  reference: { fontSize: 10, color: colors.muted, marginTop: 1 },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateText: { fontSize: 10.5, color: colors.muted },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  customerName: { fontSize: 13, fontWeight: font.bold, color: colors.text },
  customerMeta: { fontSize: 10, color: colors.muted, marginTop: 1 },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 9 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  itemQty: {
    minWidth: 34,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  itemQtyText: { fontSize: 11, fontWeight: font.bold, color: colors.primary },
  itemName: { fontSize: 12, fontWeight: font.semibold, color: colors.text },
  itemMeta: { fontSize: 9.5, color: colors.muted, marginTop: 1 },
  itemTotal: { fontSize: 11.5, fontWeight: font.bold, color: colors.text },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  summaryLabel: { fontSize: 11.5, color: colors.muted },
  summaryValue: { fontSize: 11.5, fontWeight: font.semibold, color: colors.text },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
    paddingTop: 8,
    marginBottom: 4,
  },
  totalLabel: { fontSize: 13, fontWeight: font.bold, color: colors.text },
  totalValue: { fontSize: 19, fontWeight: font.heavy, color: colors.primary },
  noteBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  noteLabel: { fontSize: 9, fontWeight: font.bold, color: colors.muted, letterSpacing: 0.5 },
  noteText: { fontSize: 11.5, color: colors.textSoft, marginTop: 2 },
  cancelInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  cancelTitle: { fontSize: 12, fontWeight: font.bold, color: colors.danger },
  cancelText: { fontSize: 10, color: colors.danger, marginTop: 1 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  footer: {
    textAlign: "center",
    fontSize: 9.5,
    color: colors.muted,
    marginTop: spacing.lg,
  },
  cancelModalText: { fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: spacing.md },
});
