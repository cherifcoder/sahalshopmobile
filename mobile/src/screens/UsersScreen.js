import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { userApi } from "../api/services";
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
  Select,
} from "../components";
import { useAuth } from "../context/AuthContext";
import { colors, font, radius, spacing } from "../theme";
import { formatDate } from "../utils/format";

const ROLES = [
  { value: "employee", label: "Employé" },
  { value: "admin", label: "Administrateur" },
];

const EMPTY = {
  name: "",
  username: "",
  password: "",
  role: "employee",
  phone: "",
  active: true,
};

export default function UsersScreen({ navigation }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await userApi.list({ limit: 100 });
      setUsers(response.data || []);
    } catch (err) {
      setError(err.message || "Impossible de charger les utilisateurs.");
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

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (user) => {
    setEditingId(user._id);
    setForm({
      name: user.name || "",
      username: user.username || "",
      password: "",
      role: user.role || "employee",
      phone: user.phone || "",
      active: user.active !== false,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      return Alert.alert("Champs requis", "Renseignez le nom et l'identifiant.");
    }
    if (!editingId && !form.password) {
      return Alert.alert("Mot de passe requis", "Définissez un mot de passe (libre).");
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        username: form.username.trim(),
        role: form.role,
        phone: form.phone.trim(),
        active: form.active,
      };
      if (form.password) payload.password = form.password;
      if (editingId) await userApi.update(editingId, payload);
      else await userApi.create(payload);
      setOpen(false);
      await load();
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = (user) => {
    if (user._id === currentUser?._id) {
      return Alert.alert("Action impossible", "Vous ne pouvez pas supprimer votre propre compte.");
    }
    Alert.alert("Supprimer cet utilisateur ?", `Le compte de ${user.name} sera supprimé.`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await userApi.remove(user._id);
            await load();
          } catch (err) {
            Alert.alert("Erreur", err.message);
          }
        },
      },
    ]);
  };

  if (loading && users.length === 0) {
    return (
      <Screen scroll={false}>
        <LoadingView label="Chargement des utilisateurs…" />
      </Screen>
    );
  }

  return (
    <>
      <Screen refreshing={refreshing} onRefresh={() => load(true)}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Utilisateurs</Text>
            <Text style={styles.subtitle}>Gérez les accès à la boutique</Text>
          </View>
          <Button title="Ajouter" icon="person-add-outline" small onPress={openCreate} />
        </View>

        {error ? (
          <Pressable onPress={() => load()} style={styles.errorBox}>
            <Ionicons name="warning-outline" size={17} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retry}>Réessayer</Text>
          </Pressable>
        ) : null}

        {users.length === 0 ? (
          <Card>
            <EmptyState
              icon="people-outline"
              title="Aucun utilisateur"
              actionLabel="Créer un compte"
              onAction={openCreate}
            />
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {users.map((user) => (
              <Pressable
                key={user._id}
                onPress={() => openEdit(user)}
                style={({ pressed }) => [styles.userCard, pressed && styles.pressed]}
              >
                <Avatar name={user.name} size={46} />
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
                    {user._id === currentUser?._id ? (
                      <Badge label="Vous" variant="primary" />
                    ) : null}
                  </View>
                  <Text style={styles.meta}>@{user.username}{user.phone ? ` • ${user.phone}` : ""}</Text>
                  <Text style={styles.date}>
                    Dernière connexion : {user.lastLoginAt ? formatDate(user.lastLoginAt, true) : "jamais"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 5 }}>
                  <Badge
                    label={user.role === "admin" ? "Admin" : "Employé"}
                    variant={user.role === "admin" ? "gold" : "default"}
                  />
                  <Badge
                    label={user.active === false ? "Inactif" : "Actif"}
                    variant={user.active === false ? "danger" : "success"}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.hint}>
          Le mot de passe est libre : aucune contrainte de complexité n'est imposée.
        </Text>
      </Screen>

      <ModalSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
        footer={
          <Button
            title={editingId ? "Enregistrer" : "Créer le compte"}
            icon="checkmark-circle-outline"
            onPress={save}
            loading={saving}
          />
        }
      >
        <Input
          label="Nom complet *"
          value={form.name}
          onChangeText={set("name")}
          icon="person-outline"
          autoCapitalize="words"
        />
        <Input
          label="Identifiant de connexion *"
          value={form.username}
          onChangeText={set("username")}
          icon="at-outline"
          autoCapitalize="none"
        />
        <Input
          label={editingId ? "Nouveau mot de passe (optionnel)" : "Mot de passe *"}
          value={form.password}
          onChangeText={set("password")}
          icon="lock-closed-outline"
          secureTextEntry
          placeholder={editingId ? "Laisser vide pour conserver" : "Mot de passe libre"}
        />
        <Select
          label="Rôle"
          value={form.role}
          options={ROLES}
          onChange={set("role")}
          icon="shield-outline"
        />
        <Input
          label="Téléphone"
          value={form.phone}
          onChangeText={set("phone")}
          icon="call-outline"
          keyboardType="phone-pad"
        />
        {editingId ? (
          <View style={styles.activeRow}>
            <Text style={styles.activeText}>Compte actif</Text>
            <Switch
              value={form.active}
              onValueChange={set("active")}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>
        ) : null}
        {editingId && editingId !== currentUser?._id ? (
          <Button
            title="Supprimer cet utilisateur"
            icon="trash-outline"
            variant="ghost"
            onPress={() => {
              const target = users.find((item) => item._id === editingId);
              if (target) {
                setOpen(false);
                remove(target);
              }
            }}
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
  userCard: {
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
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontSize: 13.5, fontWeight: font.bold, color: colors.text },
  meta: { fontSize: 10.5, color: colors.muted, marginTop: 1 },
  date: { fontSize: 9, color: colors.muted, marginTop: 2 },
  hint: {
    fontSize: 10.5,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 16,
  },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  activeText: { fontSize: 12.5, fontWeight: font.semibold, color: colors.text },
});
