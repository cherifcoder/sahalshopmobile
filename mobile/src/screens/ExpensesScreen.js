import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { expenseApi } from "../api/services";
import {
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
  Select,
  StatCard,
} from "../components";
import { colors, font, radius, spacing } from "../theme";
import {
  EXPENSE_ICONS,
  EXPENSE_LABELS,
  formatDate,
  formatMoney,
  formatNumber,
  toISODate,
} from "../utils/format";

const CATEGORY_OPTIONS = Object.entries(EXPENSE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank", label: "Banque" },
  { value: "other", label: "Autre" },
];

const EMPTY = {
  label: "",
  amount: "",
  category: "other",
  date: toISODate(),
  paymentMethod: "cash",
  note: "",
};

export default function ExpensesScreen({ navigation }) {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await expenseApi.list({
        limit: 200,
        ...(category ? { category } : {}),
      });
      setExpenses(response.data || []);
      setSummary(response.summary || {});
    } catch (err) {
      setError(err.message || "Impossible de charger les dépenses.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return expenses;
    return expenses.filter((expense) =>
      [expense.label, expense.note, EXPENSE_LABELS[expense.category]]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search))
    );
  }, [expenses, query]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (expense) => {
    setEditingId(expense._id);
    setForm({
      label: expense.label,
      amount: String(expense.amount),
      category: expense.category,
      date: toISODate(expense.date),
      paymentMethod: expense.paymentMethod || "cash",
      note: expense.note || "",
    });
    setOpen(true);
  };

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!form.label.trim()) return Alert.alert("Libellé requis", "Précisez la dépense.");
    if (!Number(form.amount) || Number(form.amount) <= 0) {
      return Alert.alert("Montant invalide", "Saisissez un montant supérieur à zéro.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      return Alert.alert("Date invalide", "Utilisez le format AAAA-MM-JJ.");
    }
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        amount: Number(form.amount),
        category: form.category,
        date: form.date,
        paymentMethod: form.paymentMethod,
        note: form.note.trim(),
      };
      if (editingId) await expenseApi.update(editingId, payload);
      else await expenseApi.create(payload);
      setOpen(false);
      await load();
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert("Supprimer cette dépense ?", "Cette action est définitive.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await expenseApi.remove(editingId);
            setOpen(false);
            await load();
          } catch (err) {
            Alert.alert("Erreur", err.message);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading && expenses.length === 0) {
    return (
      <Screen scroll={false}>
        <LoadingView label="Chargement des dépenses…" />
      </Screen>
    );
  }

  return (
    <>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Dépenses</Text>
            <Text style={styles.subtitle}>
              {formatNumber(expenses.length)} dépense(s) affichée(s)
            </Text>
          </View>
          <Button title="Ajouter" icon="add" small onPress={openCreate} />
        </View>

        <StatCard
          title="Total des dépenses"
          value={formatMoney(summary.total)}
          subtitle={category ? EXPENSE_LABELS[category] : "Toutes catégories"}
          icon="receipt-outline"
          tone="danger"
        />

        <View style={styles.chips}>
          <Chip label="Toutes" active={!category} onPress={() => setCategory("")} />
          <Chip
            label="Carburant"
            icon="car-outline"
            active={category === "fuel"}
            onPress={() => setCategory("fuel")}
          />
          <Chip
            label="Salaires"
            icon="people-outline"
            active={category === "salary"}
            onPress={() => setCategory("salary")}
          />
          <Chip
            label="Livraison"
            icon="bicycle-outline"
            active={category === "delivery"}
            onPress={() => setCategory("delivery")}
          />
          <Chip
            label="Autres"
            icon="ellipsis-horizontal"
            active={category === "other"}
            onPress={() => setCategory("other")}
          />
        </View>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Libellé, note…"
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
              title={query ? "Aucun résultat" : "Aucune dépense"}
              message={
                query
                  ? "Essayez un autre mot-clé."
                  : "Enregistrez le carburant, les salaires, la livraison…"
              }
              actionLabel={!query ? "Ajouter une dépense" : undefined}
              onAction={openCreate}
            />
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {filtered.map((expense) => (
              <Pressable
                key={expense._id}
                onPress={() => openEdit(expense)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.icon}>
                  <Ionicons
                    name={EXPENSE_ICONS[expense.category] || "receipt-outline"}
                    size={19}
                    color={colors.danger}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label} numberOfLines={1}>{expense.label}</Text>
                  <Text style={styles.meta}>
                    {EXPENSE_LABELS[expense.category] || expense.category} •{" "}
                    {formatDate(expense.date)}
                  </Text>
                  {expense.note ? (
                    <Text style={styles.note} numberOfLines={1}>{expense.note}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.amount}>{formatMoney(expense.amount)}</Text>
                  <Badge label={expense.paymentMethod === "cash" ? "Espèces" : "Autre"} variant="default" style={{ marginTop: 4 }} />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </Screen>

      <ModalSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Modifier la dépense" : "Nouvelle dépense"}
        footer={
          <Button
            title={editingId ? "Enregistrer les modifications" : "Enregistrer la dépense"}
            icon="checkmark-circle-outline"
            onPress={save}
            loading={saving}
          />
        }
      >
        <Input
          label="Libellé *"
          value={form.label}
          onChangeText={set("label")}
          placeholder="Ex. Plein de carburant"
          icon="create-outline"
          autoCapitalize="sentences"
        />
        <Input
          label="Montant *"
          value={form.amount}
          onChangeText={set("amount")}
          placeholder="0"
          keyboardType="numeric"
          icon="cash-outline"
        />
        <Select
          label="Catégorie"
          value={form.category}
          options={CATEGORY_OPTIONS}
          onChange={set("category")}
          icon="grid-outline"
        />
        <Input
          label="Date"
          value={form.date}
          onChangeText={set("date")}
          placeholder="AAAA-MM-JJ"
          icon="calendar-outline"
          keyboardType="numbers-and-punctuation"
        />
        <Select
          label="Moyen de paiement"
          value={form.paymentMethod}
          options={METHODS}
          onChange={set("paymentMethod")}
          icon="card-outline"
        />
        <Input
          label="Note"
          value={form.note}
          onChangeText={set("note")}
          placeholder="Détails, fournisseur…"
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
        />
        {editingId ? (
          <Button
            title="Supprimer la dépense"
            icon="trash-outline"
            variant="ghost"
            onPress={remove}
            loading={deleting}
            style={{ marginTop: spacing.sm }}
          />
        ) : null}
      </ModalSheet>
    </>
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pressed: { opacity: 0.8 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 13, fontWeight: font.bold, color: colors.text },
  meta: { fontSize: 10, color: colors.muted, marginTop: 2 },
  note: { fontSize: 9.5, color: colors.textSoft, marginTop: 1, fontStyle: "italic" },
  amount: { fontSize: 13, fontWeight: font.heavy, color: colors.danger },
});
