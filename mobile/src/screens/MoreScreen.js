import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, Badge, Card, Logo, Screen, SectionHeader } from "../components";
import { useAuth } from "../context/AuthContext";
import { colors, font, radius, shadows, spacing } from "../theme";

const MENU = [
  {
    key: "expenses",
    label: "Dépenses",
    description: "Carburant, salaires, livraison…",
    icon: "receipt-outline",
    color: colors.danger,
    background: colors.dangerSoft,
    screen: "Expenses",
  },
  {
    key: "losses",
    label: "Pertes d'articles",
    description: "Casse, vol, péremption",
    icon: "warning-outline",
    color: colors.warning,
    background: colors.warningSoft,
    screen: "Losses",
  },
  {
    key: "users",
    label: "Utilisateurs",
    description: "Comptes et rôles de la boutique",
    icon: "people-outline",
    color: colors.primary,
    background: colors.primaryLight,
    screen: "Users",
    adminOnly: true,
  },
  {
    key: "profile",
    label: "Mon profil",
    description: "Informations et mot de passe",
    icon: "person-circle-outline",
    color: colors.info,
    background: colors.infoSoft,
    screen: "Profile",
  },
];

export default function MoreScreen({ navigation }) {
  const { user, logout, apiUrl, isAdmin } = useAuth();

  const confirmLogout = () => {
    Alert.alert("Se déconnecter ?", "Vous devrez vous reconnecter pour accéder à la boutique.", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <Screen edges={["top", "left", "right"]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <Logo size={44} rounded />
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>SAHAL SHOP</Text>
            <Text style={styles.tagline}>Gestion de boutique</Text>
          </View>
          <Badge label={isAdmin ? "ADMIN" : "EMPLOYÉ"} variant="gold" />
        </View>
        <View style={styles.profile}>
          <Avatar name={user?.name} size={54} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.username}>@{user?.username}</Text>
            <Text style={styles.phone}>{user?.phone || "Téléphone non renseigné"}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("Profile")} style={styles.editBtn}>
            <Ionicons name="create-outline" size={18} color={colors.white} />
          </Pressable>
        </View>
      </LinearGradient>

      <SectionHeader title="Gestion de la boutique" />
      <View style={{ gap: spacing.sm }}>
        {MENU.filter((item) => !item.adminOnly || isAdmin).map((item) => (
          <Pressable
            key={item.key}
            onPress={() => navigation.navigate(item.screen)}
            style={({ pressed }) => [styles.menu, pressed && styles.pressed]}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.background }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Application" />
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="server-outline" size={17} color={colors.muted} />
          <Text style={styles.infoLabel}>Serveur</Text>
          <Text style={styles.infoValue} numberOfLines={1}>{apiUrl}</Text>
        </View>
        <View style={[styles.infoRow, styles.rowBorder]}>
          <Ionicons name="information-circle-outline" size={17} color={colors.muted} />
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>{Constants.expoConfig?.version || "1.0.0"}</Text>
        </View>
        <View style={[styles.infoRow, styles.rowBorder]}>
          <Ionicons name="shield-checkmark-outline" size={17} color={colors.muted} />
          <Text style={styles.infoLabel}>Rôle</Text>
          <Text style={styles.infoValue}>{isAdmin ? "Administrateur" : "Employé"}</Text>
        </View>
      </Card>

      <Pressable onPress={confirmLogout} style={styles.logout}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>

      <Text style={styles.footer}>SAHAL SHOP • Point de vente & gestion de stock</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.floating,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brand: { color: colors.white, fontSize: 14, fontWeight: font.heavy, letterSpacing: 1.2 },
  tagline: { color: "rgba(255,255,255,0.65)", fontSize: 10, marginTop: 1 },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
  },
  avatar: { backgroundColor: "rgba(255,255,255,0.15)" },
  name: { color: colors.white, fontSize: 17, fontWeight: font.bold },
  username: { color: "rgba(255,255,255,0.68)", fontSize: 10.5, marginTop: 1 },
  phone: { color: "rgba(255,255,255,0.55)", fontSize: 10, marginTop: 2 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
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
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: 13.5, fontWeight: font.bold, color: colors.text },
  menuDescription: { fontSize: 10.5, color: colors.muted, marginTop: 1 },
  infoCard: { paddingVertical: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  infoLabel: { fontSize: 11.5, color: colors.muted, width: 68 },
  infoValue: { flex: 1, fontSize: 10.5, color: colors.textSoft, textAlign: "right" },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  logoutText: { color: colors.danger, fontSize: 13, fontWeight: font.bold },
  footer: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 9.5,
    marginTop: spacing.lg,
  },
});
