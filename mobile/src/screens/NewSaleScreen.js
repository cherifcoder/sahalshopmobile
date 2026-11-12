import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { articleApi, customerApi, saleApi } from "../api/services";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  LoadingView,
  ModalSheet,
  Screen,
  SearchBar,
  SectionHeader,
} from "../components";
import { colors, font, radius, shadows, spacing } from "../theme";
import { formatMoney, formatNumber } from "../utils/format";

const PAYMENT_TYPES = [
  { value: "cash", label: "Espèces", icon: "cash-outline" },
  { value: "mobile_money", label: "Mobile Money", icon: "phone-portrait-outline" },
  { value: "credit", label: "Crédit", icon: "time-outline" },
];

export default function NewSaleScreen({ navigation }) {
  const [articles, setArticles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [discount, setDiscount] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [articlesResponse, customersResponse] = await Promise.all([
        articleApi.list({ limit: 200 }),
        customerApi.list({ limit: 200 }),
      ]);
      setArticles(articlesResponse.data || []);
      setCustomers(customersResponse.data || []);
    } catch (err) {
      setError(err.message || "Impossible de charger les données de vente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const lines = useMemo(() => Object.values(cart), [cart]);
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.article.salePrice * line.quantity, 0),
    [lines]
  );
  const discountValue = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = Math.max(subtotal - discountValue, 0);
  const paidValue =
    paymentType === "credit"
      ? Math.min(Math.max(Number(amountPaid) || 0, 0), total)
      : total;
  const balanceDue = Math.max(total - paidValue, 0);

  const filteredArticles = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return articles;
    return articles.filter((article) =>
      [article.name, article.sku, article.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search))
    );
  }, [articles, query]);

  const filteredCustomers = useMemo(() => {
    const search = customerQuery.trim().toLowerCase();
    if (!search) return customers;
    return customers.filter((item) =>
      [item.name, item.phone].filter(Boolean).some((value) => value.toLowerCase().includes(search))
    );
  }, [customers, customerQuery]);

  const addArticle = (article) => {
    setCart((prev) => {
      const current = prev[article._id]?.quantity || 0;
      if (current >= article.stock) {
        Alert.alert("Stock insuffisant", `Il ne reste que ${article.stock} ${article.unit || "unité(s)"} de ${article.name}.`);
        return prev;
      }
      return {
        ...prev,
        [article._id]: { article, quantity: current + 1 },
      };
    });
  };

  const removeArticle = (article) => {
    setCart((prev) => {
      const current = prev[article._id]?.quantity || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[article._id];
        return next;
      }
      return {
        ...prev,
        [article._id]: { article, quantity: current - 1 },
      };
    });
  };

  const selectPayment = (value) => {
    setPaymentType(value);
    if (value !== "credit") {
      setAmountPaid("");
    } else if (customer?.balance) {
      // rien à préremplir, l'acompte reste optionnel
    }
  };

  const submit = async () => {
    setError("");
    if (lines.length === 0) return setError("Ajoutez au moins un article à la vente.");
    if (paymentType === "credit" && !customer) {
      return setError("Sélectionnez un client pour une vente à crédit.");
    }
    if (paymentType === "credit" && customer?.creditLimit > 0) {
      if (customer.balance + balanceDue > customer.creditLimit) {
        return setError(
          `Limite de crédit dépassée. Disponible : ${formatMoney(
            Math.max(customer.creditLimit - customer.balance, 0)
          )}.`
        );
      }
    }

    setSubmitting(true);
    try {
      const response = await saleApi.create({
        items: lines.map((line) => ({
          articleId: line.article._id,
          quantity: line.quantity,
        })),
        customerId: customer?._id || null,
        paymentType,
        amountPaid: paymentType === "credit" ? Number(amountPaid) || 0 : total,
        discount: discountValue,
        note: note.trim(),
      });
      setCart({});
      Alert.alert(
        "Vente enregistrée ✅",
        `Facture ${response.sale.invoiceNumber} générée.\nTotal : ${formatMoney(response.sale.total)}`,
        [
          {
            text: "Fermer",
            style: "cancel",
            onPress: () => load(),
          },
          {
            text: "Voir la facture",
            onPress: () =>
              navigation.replace("SaleDetail", { id: response.sale._id }),
          },
        ]
      );
    } catch (err) {
      setError(err.message || "Impossible d'enregistrer la vente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <LoadingView label="Préparation de la vente…" />
      </Screen>
    );
  }

  const footer = (
    <View style={styles.footer}>
      <View style={{ flex: 1 }}>
        <Text style={styles.footerLabel}>TOTAL À PAYER</Text>
        <Text style={styles.footerTotal}>{formatMoney(total)}</Text>
        <Text style={styles.footerLines}>
          {formatNumber(lines.reduce((sum, line) => sum + line.quantity, 0))} article(s)
        </Text>
      </View>
      <Button
        title={paymentType === "credit" ? "Vendre à crédit" : "Encaisser"}
        icon="checkmark-circle-outline"
        onPress={submit}
        loading={submitting}
        disabled={lines.length === 0}
        style={{ flex: 1.15 }}
      />
    </View>
  );

  return (
    <>
      <Screen
        edges={["bottom", "left", "right"]}
        refreshing={false}
        onRefresh={load}
        footer={footer}
        contentStyle={{ paddingBottom: 24 }}
      >
        <Card style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <Text style={styles.blockLabel}>CLIENT</Text>
            <Pressable onPress={() => setCustomerOpen(true)}>
              <Text style={styles.change}>{customer ? "Changer" : "Choisir"}</Text>
            </Pressable>
          </View>
          {customer ? (
            <View style={styles.selectedCustomer}>
              <Avatar name={customer.name} size={42} />
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.customerMeta}>
                  {customer.phone || "Sans téléphone"} • Dette {formatMoney(customer.balance)}
                </Text>
              </View>
              <Pressable onPress={() => setCustomer(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setCustomerOpen(true)} style={styles.addCustomer}>
              <Ionicons name="person-add-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addCustomerTitle}>
                  {paymentType === "credit" ? "Client obligatoire pour le crédit" : "Client de passage"}
                </Text>
                <Text style={styles.addCustomerText}>
                  {paymentType === "credit"
                    ? "Sélectionnez le client qui règle à crédit."
                    : "Appuyez pour associer un client (optionnel)."}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          )}
        </Card>

        <SectionHeader title="Mode de paiement" />
        <View style={styles.paymentTypes}>
          {PAYMENT_TYPES.map((type) => (
            <Chip
              key={type.value}
              label={type.label}
              icon={type.icon}
              active={paymentType === type.value}
              onPress={() => selectPayment(type.value)}
            />
          ))}
        </View>

        <SectionHeader
          title="Panier"
          subtitle={lines.length ? `${lines.length} ligne(s)` : "Aucun article"}
          actionLabel={lines.length ? "Vider" : undefined}
          onAction={() => setCart({})}
        />
        {lines.length === 0 ? (
          <Card>
            <EmptyState
              icon="cart-outline"
              title="Panier vide"
              message="Ajoutez des articles ci-dessous pour démarrer la vente."
            />
          </Card>
        ) : (
          <Card style={{ paddingVertical: 4 }}>
            {lines.map((line, index) => (
              <View key={line.article._id} style={[styles.line, index > 0 && styles.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineName} numberOfLines={1}>{line.article.name}</Text>
                  <Text style={styles.lineMeta}>
                    {formatMoney(line.article.salePrice)} • stock {line.article.stock}
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable onPress={() => removeArticle(line.article)} style={styles.stepBtn}>
                    <Ionicons name="remove" size={16} color={colors.primary} />
                  </Pressable>
                  <Text style={styles.qty}>{line.quantity}</Text>
                  <Pressable onPress={() => addArticle(line.article)} style={styles.stepBtn}>
                    <Ionicons name="add" size={16} color={colors.primary} />
                  </Pressable>
                </View>
                <Text style={styles.lineTotal}>
                  {formatMoney(line.article.salePrice * line.quantity)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        <SectionHeader title="Ajouter des articles" />
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un article…"
        />
        {filteredArticles.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title="Aucun article disponible"
            message="Ajoutez du stock depuis l'onglet Articles."
          />
        ) : (
          <View style={{ gap: 7 }}>
            {filteredArticles.map((article) => {
              const selected = cart[article._id]?.quantity || 0;
              const soldOut = article.stock <= 0;
              return (
                <View
                  key={article._id}
                  style={[styles.articleRow, soldOut && { opacity: 0.5 }]}
                >
                  <View style={styles.articleIcon}>
                    <Text style={styles.articleInitial}>{article.name[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.articleName} numberOfLines={1}>{article.name}</Text>
                    <Text style={styles.articleMeta}>
                      {formatMoney(article.salePrice)} • {article.stock} en stock
                    </Text>
                  </View>
                  {selected > 0 ? (
                    <Badge label={`${selected} sélectionné(s)`} variant="primary" />
                  ) : (
                    <Pressable
                      onPress={() => addArticle(article)}
                      disabled={soldOut}
                      style={[styles.addBtn, soldOut && { backgroundColor: colors.surfaceAlt }]}
                    >
                      <Ionicons
                        name="add"
                        size={20}
                        color={soldOut ? colors.muted : colors.white}
                      />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <SectionHeader title="Récapitulatif" />
        <Card>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sous-total</Text>
            <Text style={styles.summaryValue}>{formatMoney(subtotal)}</Text>
          </View>
          <View style={styles.discountRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="Remise"
                value={discount}
                onChangeText={setDiscount}
                placeholder="0"
                keyboardType="numeric"
                icon="pricetag-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Total net</Text>
              <Text style={styles.totalValue}>{formatMoney(total)}</Text>
            </View>
          </View>

          {paymentType === "credit" ? (
            <>
              <Input
                label="Acompte versé (optionnel)"
                value={amountPaid}
                onChangeText={setAmountPaid}
                placeholder="0"
                keyboardType="numeric"
                icon="cash-outline"
              />
              <View style={styles.creditBox}>
                <View>
                  <Text style={styles.creditLabel}>Reste à crédit</Text>
                  <Text style={styles.creditValue}>{formatMoney(balanceDue)}</Text>
                </View>
                <Ionicons name="time-outline" size={24} color={colors.warning} />
              </View>
              {customer ? (
                <Text style={styles.creditHint}>
                  Dette après vente : {formatMoney(customer.balance + balanceDue)}
                  {customer.creditLimit > 0
                    ? ` / plafond ${formatMoney(customer.creditLimit)}`
                    : " (plafond illimité)"}
                </Text>
              ) : null}
            </>
          ) : null}

          <Input
            label="Note"
            value={note}
            onChangeText={setNote}
            placeholder="Commentaire sur la vente…"
            multiline
            numberOfLines={2}
            autoCapitalize="sentences"
          />
        </Card>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={17} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </Screen>

      <ModalSheet
        visible={customerOpen}
        onClose={() => setCustomerOpen(false)}
        title="Sélectionner un client"
      >
        <SearchBar
          value={customerQuery}
          onChangeText={setCustomerQuery}
          placeholder="Nom ou téléphone…"
        />
        {paymentType !== "credit" ? (
          <Pressable
            onPress={() => {
              setCustomer(null);
              setCustomerOpen(false);
            }}
            style={styles.walkin}
          >
            <View style={styles.walkinIcon}>
              <Ionicons name="walk-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.walkinTitle}>Client de passage</Text>
              <Text style={styles.walkinText}>Vente comptant sans compte client</Text>
            </View>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
          </Pressable>
        ) : null}

        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Aucun client"
            message="Créez un client depuis l'onglet Clients."
          />
        ) : (
          filteredCustomers.map((item) => (
            <Pressable
              key={item._id}
              onPress={() => {
                setCustomer(item);
                setCustomerOpen(false);
              }}
              style={styles.customerOption}
            >
              <Avatar name={item.name} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionName}>{item.name}</Text>
                <Text style={styles.optionMeta}>
                  {item.phone || "Sans téléphone"} • dette {formatMoney(item.balance)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {item.creditLimit > 0 ? (
                  <Badge
                    label={`dispo ${formatMoney(Math.max(item.creditLimit - item.balance, 0))}`}
                    variant={item.balance >= item.creditLimit ? "danger" : "success"}
                  />
                ) : (
                  <Badge label="Illimité" variant="primary" />
                )}
              </View>
            </Pressable>
          ))
        )}
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
  footerLabel: { fontSize: 8.5, color: colors.muted, fontWeight: font.bold, letterSpacing: 0.6 },
  footerTotal: { fontSize: 20, fontWeight: font.heavy, color: colors.primary },
  footerLines: { fontSize: 9.5, color: colors.muted },
  customerCard: { padding: spacing.md },
  customerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  blockLabel: { fontSize: 9, fontWeight: font.bold, color: colors.muted, letterSpacing: 0.8 },
  change: { fontSize: 11, fontWeight: font.bold, color: colors.primary },
  selectedCustomer: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  customerName: { fontSize: 13.5, fontWeight: font.bold, color: colors.text },
  customerMeta: { fontSize: 10, color: colors.muted, marginTop: 1 },
  addCustomer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },
  addCustomerTitle: { fontSize: 12.5, fontWeight: font.semibold, color: colors.text },
  addCustomerText: { fontSize: 10, color: colors.muted, marginTop: 1 },
  paymentTypes: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 9,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  lineName: { fontSize: 12, fontWeight: font.semibold, color: colors.text },
  lineMeta: { fontSize: 9.5, color: colors.muted, marginTop: 1 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    padding: 2,
  },
  stepBtn: { width: 25, height: 25, alignItems: "center", justifyContent: "center" },
  qty: { minWidth: 22, textAlign: "center", fontSize: 12, fontWeight: font.bold, color: colors.primary },
  lineTotal: { fontSize: 11.5, fontWeight: font.bold, color: colors.text, minWidth: 74, textAlign: "right" },
  articleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  articleIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  articleInitial: { fontSize: 15, fontWeight: font.bold, color: colors.primary },
  articleName: { fontSize: 12, fontWeight: font.semibold, color: colors.text },
  articleMeta: { fontSize: 9.5, color: colors.muted, marginTop: 1 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  summaryLabel: { fontSize: 11, color: colors.muted },
  summaryValue: { fontSize: 13, fontWeight: font.semibold, color: colors.text },
  discountRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md },
  totalValue: { fontSize: 21, fontWeight: font.heavy, color: colors.primary, marginTop: 7 },
  creditBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: -2,
  },
  creditLabel: { fontSize: 10.5, color: colors.warning },
  creditValue: { fontSize: 18, fontWeight: font.heavy, color: colors.warning, marginTop: 1 },
  creditHint: { fontSize: 9.5, color: colors.muted, marginTop: 7 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 11.5 },
  walkin: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.sm,
  },
  walkinIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  walkinTitle: { fontSize: 12.5, fontWeight: font.bold, color: colors.primary },
  walkinText: { fontSize: 10, color: colors.primaryMid, marginTop: 1 },
  customerOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionName: { fontSize: 12.5, fontWeight: font.semibold, color: colors.text },
  optionMeta: { fontSize: 10, color: colors.muted, marginTop: 1 },
});
