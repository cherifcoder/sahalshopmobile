import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { authApi } from "../api/services";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Screen,
  SectionHeader,
} from "../components";
import { useAuth } from "../context/AuthContext";
import { colors, font, radius, spacing } from "../theme";

export default function ProfileScreen({ navigation }) {
  const { user, apiUrl, refreshUser, logout, isAdmin } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changing, setChanging] = useState(false);

  const saveProfile = async () => {
    if (!name.trim()) return Alert.alert("Nom requis", "Renseignez votre nom.");
    setSaving(true);
    try {
      await authApi.updateProfile({ name: name.trim(), phone: phone.trim() });
      await refreshUser();
      Alert.alert("Profil mis à jour", "Vos informations ont été enregistrées.");
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      return Alert.alert("Champs requis", "Renseignez les deux mots de passe.");
    }
    setChanging(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("Mot de passe modifié", "Utilisez-le lors de votre prochaine connexion.");
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setChanging(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Se déconnecter ?", "Vous devrez vous reconnecter.", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <Screen>
      <Card style={styles.profileCard}>
        <Avatar name={user?.name} size={70} />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
        <Badge
          label={isAdmin ? "Administrateur" : "Employé"}
          variant={isAdmin ? "gold" : "primary"}
          style={{ marginTop: 6 }}
        />
      </Card>

      <SectionHeader title="Mes informations" />
      <Card>
        <Input
          label="Nom complet"
          value={name}
          onChangeText={setName}
          icon="person-outline"
          autoCapitalize="words"
        />
        <Input
          label="Téléphone"
          value={phone}
          onChangeText={setPhone}
          icon="call-outline"
          keyboardType="phone-pad"
        />
        <Input
          label="Identifiant"
          value={user?.username}
          editable={false}
          icon="at-outline"
        />
        <Button
          title="Enregistrer mon profil"
          icon="checkmark-circle-outline"
          onPress={saveProfile}
          loading={saving}
        />
      </Card>

      <SectionHeader title="Sécurité" subtitle="Le mot de passe est libre" />
      <Card>
        <Input
          label="Mot de passe actuel"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          icon="lock-closed-outline"
          secureTextEntry={!showPassword}
          rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
          onRightIconPress={() => setShowPassword((value) => !value)}
        />
        <Input
          label="Nouveau mot de passe"
          value={newPassword}
          onChangeText={setNewPassword}
          icon="key-outline"
          secureTextEntry={!showPassword}
          placeholder="Choisissez librement"
        />
        <Button
          title="Changer le mot de passe"
          icon="shield-checkmark-outline"
          variant="secondary"
          onPress={changePassword}
          loading={changing}
        />
      </Card>

      <SectionHeader title="Connexion" />
      <Card>
        <View style={styles.serverRow}>
          <Ionicons name="server-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.serverLabel}>Adresse de l'API</Text>
            <Text style={styles.serverValue} numberOfLines={1}>{apiUrl}</Text>
          </View>
        </View>
        <Text style={styles.serverHint}>
          Pour changer de serveur, déconnectez-vous puis touchez l'adresse affichée
          sur l'écran de connexion.
        </Text>
      </Card>

      <Button
        title="Se déconnecter"
        icon="log-out-outline"
        variant="danger"
        onPress={confirmLogout}
        style={{ marginTop: spacing.lg }}
      />
      <Text style={styles.footer}>SAHAL SHOP • v1.0.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: "center", paddingVertical: spacing.xl },
  name: { fontSize: 19, fontWeight: font.heavy, color: colors.text, marginTop: spacing.sm },
  username: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  serverRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  serverLabel: { fontSize: 10.5, color: colors.muted },
  serverValue: {
    fontSize: 10.5,
    color: colors.textSoft,
    marginTop: 1,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  serverHint: { fontSize: 10, color: colors.muted, lineHeight: 15, marginTop: spacing.sm },
  footer: { fontSize: 9.5, color: colors.muted, textAlign: "center", marginTop: spacing.lg },
});
