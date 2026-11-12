import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { customerApi } from "../api/services";
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
  Select,
  StatCard,
} from "../components";
import { colors, font, radius, spacing } from "../theme";
import { formatDate, formatMoney, formatNumber, PAYMENT_LABELS } from "../utils/format";

const METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank", label: "Banque" },
  { value: "other", label: "Autre" },
];

const TX_LABELS = {
  charge: "Achat à crédit",
  payment: "Remboursement",
  adjustment: "Ajustement",
};

export default function CustomerDetailScreen({ navigation, route }) {
  const id = route.params?.id;
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [paying, setPaying] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: customer?.name || "Client",
      headerRight: () => (
        <Pressable
          onPress={() => {
            if (!customer) return;
            setEdit({
              name: customer.name || "",
              phone: customer.phone || "",
              address: customer.address || "",
              creditLimit: String(customer.creditLimit ?? 0),
              notes: customer.notes || "",
            });
            setEditOpen(true);
          }}
          hitSlop={10}
          style={{ marginRight: 4 }}
        >
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, customer]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const response = await customerApi.get(id);
        setCustomer(response.customer);
        setTransactions(response.transactions || []);
        setSales(response.sales || []);
      } catch (err) {
        setError(err.message || "Impossible de charger le client.");
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

  const openPayment = () => {
    setAmount("");
    setMethod("cash");
    setNote("");
    setPayOpen(true);
  };

  const submitPayment = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      Alert.alert("Montant invalide", "Saisissez un montant supérieur à zéro.");
      return;
    }
    if (value > customer.balance) {
      Alert.alert("Montant trop élevé", `La dette restante est de ${formatMoney(customer.balance)}.`);
      return;
    }
    setPaying(true);
    try {
      await customerApi.pay(id, {
        amount: value,
        method,
        note: note.trim(),
      });
      setPayOpen(false);
      await load();
      Alert.alert("Paiement enregistré", "Le solde du client a été mis à jour.");
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setPaying(false);
    }
  };

  const saveEdit = async () => {
    if (!edit.name?.trim()) {
      Alert.alert("Nom requis", "Le nom du client est obligatoire.");
      return;
    }
    setSavingEdit(true);
    try {
      await customerApi.update(id, {
        name: edit.name.trim(),
        phone: edit.phone?.trim() || undefined,
        address: edit.address?.trim() || "",
        creditLimit: Number(edit.creditLimit) || 0,
        notes: edit.notes?.trim() || "",
      });
      setEditOpen(false);
      await load();
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = () => {
    if (customer.balance > 0) {
      Alert.alert(
        "Dette en cours",
        "Ce client doit encore de l'argent. Encaissez la totalité de la dette avant de le supprimer."
      );
      return;
    }
    Alert.alert("Supprimer ce client ?", "Cette action est définitive.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await customerApi.remove(id);
            navigation.goBack();
          } catch (err) {
            Alert.alert("Erreur", err.message);
          }
        },
      },
    ]);
  };

  if (loading && !customer) {
    return (
      <Screen scroll={false}>
        <LoadingView label="Chargement du client…" />
      </Screen>
    );
  }

  if (!customer) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle-outline"
          title="Client introuvable"
          message={error}
          actionLabel="Réessayer"
          onAction={() => load()}
        />
      </Screen>
    );
  }

  const debt = customer.balance > 0;
  const available =
    customer.creditLimit > 0
      ? Math.max(customer.creditLimit - customer.balance, 0)
      : null;

  return (
    <>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        <Card>
          <View style={styles.profile}>
            <Avatar name={customer.name} size={58} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{customer.name}</Text>
              {customer.phone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${customer.phone.replace(/\s/g, "")}`)}
                  style={styles.contactRow}
                >
                  <Ionicons name="call-outline" size={13} color={colors.primary} />
                  <Text style={styles.contact}>{customer.phone}</Text>
                </Pressable>
              ) : null}
              {customer.address ? (
                <View style={styles.contactRow}>
                  <Ionicons name="location-outline" size={13} color={colors.muted} />
                  <Text style={styles.address}>{customer.address}</Text>
                </View>
              ) : null}
            </View>
            <Badge label={debt ? "Débiteur" : "À jour"} variant={debt ? "danger" : "success"} />
          </View>

          <View style={[styles.balanceBox, { backgroundColor: debt ? colors.dangerSoft : colors.successSoft }]}>
            <View>
              <Text style={styles.balanceLabel}>DETTE RESTANTE</Text>
              <Text style={[styles.balanceValue, { color: debt ? colors.danger : colors.success }]}>
                {formatMoney(customer.balance)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.balanceLabel}>PLAFOND</Text>
              <Text style={styles.limitValue}>
                {customer.creditLimit > 0 ? formatMoney(customer.creditLimit) : "Illimité"}
              </Text>
            </View>
          </View>

          {available !== null ? (
            <View style={styles.availableRow}>
              <Ionicons name="shield-checkmark-outline" size={15} color={colors.info} />
              <Text style={styles.availableText}>
                Crédit disponible : <Text style={styles.bold}>{formatMoney(available)}</Text>
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={styles.grid}>
          <StatCard
            title="Total achats"
            value={formatMoney(
              sales.reduce((sum, sale) => sum + (sale.status === "completed" ? sale.total : 0), 0)
            )}
            subtitle={`${formatNumber(sales.length)} vente(s)`}
            icon="cart-outline"
            tone="primary"
          />
          <StatCard
            title="Remboursements"
            value={formatMoney(
              transactions
                .filter((tx) => tx.type === "payment")
                .reduce((sum, tx) => sum + tx.amount, 0)
            )}
            subtitle="Depuis le début"
            icon="checkmark-done-outline"
            tone="success"
          />
        </View>

        <Button
          title="Encaisser un paiement"
          icon="cash-outline"
          onPress={openPayment}
          disabled={!debt}
          style={{ marginTop: spacing.md }}
        />
        {!debt ? (
          <Text style={styles.noDebt}>Ce client n'a aucune dette à régler.</Text>
        ) : null}

        {customer.notes ? (
          <>
            <SectionHeader title="Notes" />
            <Card>
              <Text style={styles.notes}>{customer.notes}</Text>
            </Card>
          </>
        ) : null}

        <SectionHeader title="Historique du crédit" subtitle="Dettes et remboursements" />
        <Card>
          {transactions.length === 0 ? (
            <EmptyState
              icon="time-outline"
              title="Aucune opération de crédit"
              message="Les ventes à crédit et les remboursements apparaîtront ici."
            />
          ) : (
            transactions.map((tx, index) => {
              const isPayment = tx.type === "payment";
              const isCharge = tx.type === "charge";
              return (
                <View key={tx._id} style={[styles.tx, index > 0 && styles.rowBorder]}>
                  <View
                    style={[
                      styles.txIcon,
                      {
                        backgroundColor: isPayment
                          ? colors.successSoft
                          : isCharge
                          ? colors.dangerSoft
                          : colors.infoSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isPayment ? "arrow-down" : isCharge ? "arrow-up" : "swap-vertical"}
                      size={15}
                      color={isPayment ? colors.success : isCharge ? colors.danger : colors.info}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>{TX_LABELS[tx.type] || tx.type}</Text>
                    <Text style={styles.txMeta} numberOfLines={1}>
                      {formatDate(tx.createdAt, true)}
                      {tx.method ? ` • ${PAYMENT_LABELS[tx.method] || tx.method}` : ""}
                      {tx.sale ? ` • ${tx.sale.reference}` : ""}
                    </Text>
                    {tx.note ? (
                      <Text style={styles.txNote} numberOfLines={1}>{tx.note}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isPayment ? colors.success : colors.danger },
                      ]}
                    >
                      {isPayment ? "-" : "+"}
                      {formatMoney(tx.amount)}
                    </Text>
                    <Text style={styles.txBalance}>solde {formatMoney(tx.balanceAfter)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        <SectionHeader title="Ventes du client" />
        <Card>
          {sales.length === 0 ? (
            <EmptyState icon="receipt-outline" title="Aucune vente" />
          ) : (
            sales.map((sale, index) => (
              <Pressable
                key={sale._id}
                onPress={() => navigation.navigate("SaleDetail", { id: sale._id })}
                style={[styles.sale, index > 0 && styles.rowBorder]}
              >
                <View style={styles.saleIcon}>
                  <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.saleRef}>{sale.reference}</Text>
                  <Text style={styles.saleMeta}>
                    {formatDate(sale.createdAt, true)} • {PAYMENT_LABELS[sale.paymentType]}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.saleTotal}>{formatMoney(sale.total)}</Text>
                  {sale.balanceDue > 0 ? (
                    <Text style={styles.saleDue}>reste {formatMoney(sale.balanceDue)}</Text>
                  ) : (
                    <Text style={styles.salePaid}>soldée</Text>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </Card>

        <Button
          title="Supprimer le client"
          icon="trash-outline"
          variant="ghost"
          onPress={remove}
          style={{ marginTop: spacing.lg }}
        />
      </Screen>

      {/* Paiement */}
      <ModalSheet
        visible={payOpen}
        onClose={() => setPayOpen(false)}
        title="Encaisser un paiement"
        footer={
          <Button
            title="Valider le paiement"
            icon="checkmark-circle-outline"
            onPress={submitPayment}
            loading={paying}
          />
        }
      >
        <View style={styles.paySummary}>
          <Text style={styles.paySummaryLabel}>Dette restante</Text>
          <Text style={styles.paySummaryValue}>{formatMoney(customer.balance)}</Text>
        </View>
        <Input
          label="Montant reçu *"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="numeric"
          icon="cash-outline"
        />
        <View style={styles.quickAmounts}>
          {[1000, 5000, 10000].map((value) => (
            <Pressable
              key={value}
              onPress={() => setAmount(String(Math.min(value, customer.balance)))}
              style={styles.quickAmount}
            >
              <Text style={styles.quickAmountText}>{formatMoney(value)}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setAmount(String(customer.balance))}
            style={[styles.quickAmount, styles.quickAmountPrimary]}
          >
            <Text style={[styles.quickAmountText, { color: colors.white }]}>Tout</Text>
          </Pressable>
        </View>
        <Select
          label="Moyen de paiement"
          value={method}
          options={METHODS}
          onChange={setMethod}
          icon="card-outline"
        />
        <Input
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="Référence, reçu…"
          autoCapitalize="sentences"
        />
      </ModalSheet>

      {/* Modification */}
      <ModalSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier le client"
        footer={
          <Button
            title="Enregistrer"
            icon="checkmark-circle-outline"
            onPress={saveEdit}
            loading={savingEdit}
          />
        }
      >
        <Input
          label="Nom complet *"
          value={edit.name}
          onChangeText={(value) => setEdit((prev) => ({ ...prev, name: value }))}
          autoCapitalize="words"
          icon="person-outline"
        />
        <Input
          label="Téléphone"
          value={edit.phone}
          onChangeText={(value) => setEdit((prev) => ({ ...prev, phone: value }))}
          keyboardType="phone-pad"
          icon="call-outline"
        />
        <Input
          label="Adresse"
          value={edit.address}
          onChangeText={(value) => setEdit((prev) => ({ ...prev, address: value }))}
          icon="location-outline"
          autoCapitalize="sentences"
        />
        <Input
          label="Plafond de crédit (0 = illimité)"
          value={edit.creditLimit}
          onChangeText={(value) => setEdit((prev) => ({ ...prev, creditLimit: value }))}
          keyboardType="numeric"
          icon="shield-checkmark-outline"
        />
        <Input
          label="Notes"
          value={edit.notes}
          onChangeText={(value) => setEdit((prev) => ({ ...prev, notes: value }))}
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
        />
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { fontSize: 17, fontWeight: font.heavy, color: colors.text },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  contact: { fontSize: 11, color: colors.primary, fontWeight: font.medium },
  address: { fontSize: 10.5, color: colors.muted, flexShrink: 1 },
  balanceBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  balanceLabel: { fontSize: 8.5, fontWeight: font.bold, color: colors.muted, letterSpacing: 0.5 },
  balanceValue: { fontSize: 25, fontWeight: font.heavy, marginTop: 1 },
  limitValue: { fontSize: 14, fontWeight: font.bold, color: colors.textSoft, marginTop: 2 },
  availableRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.sm },
  availableText: { fontSize: 10.5, color: colors.info },
  bold: { fontWeight: font.bold },
  grid: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  noDebt: { fontSize: 10.5, color: colors.muted, textAlign: "center", marginTop: 6 },
  notes: { fontSize: 12, color: colors.textSoft, lineHeight: 18 },
  tx: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 9 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  txIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: { fontSize: 12, fontWeight: font.semibold, color: colors.text },
  txMeta: { fontSize: 9.5, color: colors.muted, marginTop: 1 },
  txNote: { fontSize: 9.5, color: colors.textSoft, marginTop: 1, fontStyle: "italic" },
  txAmount: { fontSize: 12, fontWeight: font.bold },
  txBalance: { fontSize: 8.5, color: colors.muted },
  sale: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 9 },
  saleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  saleRef: { fontSize: 11.5, fontWeight: font.semibold, color: colors.text },
  saleMeta: { fontSize: 9.5, color: colors.muted, marginTop: 1 },
  saleTotal: { fontSize: 11.5, fontWeight: font.bold, color: colors.text },
  saleDue: { fontSize: 9, color: colors.danger },
  salePaid: { fontSize: 9, color: colors.success },
  paySummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  paySummaryLabel: { fontSize: 11, color: colors.danger },
  paySummaryValue: { fontSize: 17, fontWeight: font.heavy, color: colors.danger },
  quickAmounts: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: -4, marginBottom: spacing.md },
  quickAmount: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quickAmountPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickAmountText: { fontSize: 10.5, fontWeight: font.semibold, color: colors.textSoft },
});
