import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { customerApi } from "../api/services";
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
  StatCard,
} from "../components";
import { colors, font, radius, spacing } from "../theme";
import { formatMoney, formatNumber } from "../utils/format";

const EMPTY = { name: "", phone: "", address: "", creditLimit: "", notes: "" };

export default function CustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({});
  const [query, setQuery] = useState("");
  const [debtOnly, setDebtOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await customerApi.list({ limit: 200 });
      setCustomers(response.data || []);
      setSummary(response.summary || {});
    } catch (err) {
      setError(err.message || "Impossible de charger les clients.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return customers.filter((customer) => {
      if (debtOnly && customer.balance <= 0) return false;
      if (!search) return true;
      return [customer.name, customer.phone, customer.address]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search));
    });
  }, [customers, query, debtOnly]);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const create = async () => {
    if (!form.name.trim()) {
      Alert.alert("Nom requis", "Saisissez le nom du client.");
      return;
    }
    setSaving(true);
    try {
      await customerApi.create({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim(),
        creditLimit: Number(form.creditLimit) || 0,
        notes: form.notes.trim(),
      });
      setOpen(false);
      setForm(EMPTY);
      await load();
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && customers.length === 0) {
    return (
      <Screen edges={["top", "left", "right"]} scroll={false}>
        <LoadingView label="Chargement des clients…" />
      </Screen>
    );
  }

  return (
    <>
      <Screen edges={["top", "left", "right"]} refreshing={refreshing} onRefresh={() => load(true)}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Clients & Crédits</Text>
            <Text style={styles.subtitle}>
              {formatNumber(customers.length)} client(s) enregistré(s)
            </Text>
          </View>
          <Button title="Ajouter" icon="person-add-outline" small onPress={() => setOpen(true)} />
        </View>

        <View style={styles.grid}>
          <StatCard
            title="Créances totales"
            value={formatMoney(summary.totalReceivables)}
            subtitle={`${summary.debtors || 0} débiteur(s)`}
            icon="cash-outline"
            tone="gold"
          />
          <StatCard
            title="Clients"
            value={formatNumber(summary.totalCustomers)}
            subtitle="Clients actifs"
            icon="people-outline"
            tone="primary"
          />
        </View>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Nom, téléphone, adresse…"
        />
        <View style={styles.chips}>
          <Chip label="Tous" active={!debtOnly} onPress={() => setDebtOnly(false)} />
          <Chip
            label="Avec dette"
            icon="alert-circle-outline"
            active={debtOnly}
            onPress={() => setDebtOnly(true)}
          />
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
              icon="people-outline"
              title={query ? "Aucun résultat" : "Aucun client"}
              message={
                query
                  ? "Essayez un autre mot-clé."
                  : "Ajoutez un client pour suivre ses achats et ses crédits."
              }
              actionLabel={!query ? "Ajouter un client" : undefined}
              onAction={() => setOpen(true)}
            />
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {filtered.map((customer) => {
              const debt = customer.balance > 0;
              return (
                <Pressable
                  key={customer._id}
                  onPress={() => navigation.navigate("CustomerDetail", { id: customer._id })}
                  style={({ pressed }) => [styles.customerCard, pressed && styles.pressed]}
                >
                  <Avatar name={customer.name} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {customer.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {customer.phone || "Sans téléphone"}
                      {customer.address ? ` • ${customer.address}` : ""}
                    </Text>
                    {customer.creditLimit > 0 ? (
                      <Text style={styles.limit}>
                        Plafond : {formatMoney(customer.creditLimit)}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.balance, debt && { color: colors.danger }]}>
                      {formatMoney(customer.balance)}
                    </Text>
                    <Badge
                      label={debt ? "Doit" : "À jour"}
                      variant={debt ? "danger" : "success"}
                      style={{ marginTop: 4 }}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </Screen>

      <ModalSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Nouveau client"
        footer={
          <Button
            title="Enregistrer le client"
            icon="checkmark-circle-outline"
            onPress={create}
            loading={saving}
          />
        }
      >
        <Input
          label="Nom complet *"
          value={form.name}
          onChangeText={set("name")}
          placeholder="Ex. Aïssatou Ndiaye"
          icon="person-outline"
          autoCapitalize="words"
        />
        <Input
          label="Téléphone"
          value={form.phone}
          onChangeText={set("phone")}
          placeholder="+221 77 000 00 00"
          keyboardType="phone-pad"
          icon="call-outline"
        />
        <Input
          label="Adresse"
          value={form.address}
          onChangeText={set("address")}
          placeholder="Quartier, ville…"
          icon="location-outline"
          autoCapitalize="sentences"
        />
        <Input
          label="Plafond de crédit (0 = illimité)"
          value={form.creditLimit}
          onChangeText={set("creditLimit")}
          placeholder="0"
          keyboardType="numeric"
          icon="shield-checkmark-outline"
        />
        <Input
          label="Notes"
          value={form.notes}
          onChangeText={set("notes")}
          placeholder="Remarques internes…"
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
        />
      </ModalSheet>
    </>
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
  customerCard: {
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
  name: { fontSize: 13.5, fontWeight: font.bold, color: colors.text },
  meta: { fontSize: 10.5, color: colors.muted, marginTop: 2 },
  limit: { fontSize: 9.5, color: colors.muted, marginTop: 2 },
  balance: { fontSize: 13, fontWeight: font.heavy, color: colors.success },
});
