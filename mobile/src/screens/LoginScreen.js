import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { colors, font, radius, shadows, spacing } from "../theme";
import { Button, Input, Logo, ModalSheet } from "../components";

export default function LoginScreen() {
  const { login, apiUrl, updateApiUrl } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [serverOpen, setServerOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState(apiUrl);
  const [savingServer, setSavingServer] = useState(false);

  const submit = async () => {
    if (loading) return;
    setError("");
    if (!username.trim()) return setError("Saisissez votre identifiant.");
    if (!password) return setError("Saisissez votre mot de passe.");

    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  const saveServer = async () => {
    const value = serverUrl.trim();
    if (!/^https?:\/\//i.test(value)) {
      setError("L'adresse doit commencer par http:// ou https://");
      return;
    }
    setSavingServer(true);
    try {
      await updateApiUrl(value.replace(/\/+$/, ""));
      setServerOpen(false);
      setError("");
    } catch {
      setError("Impossible d'enregistrer l'adresse du serveur.");
    } finally {
      setSavingServer(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <View style={styles.logoFrame}>
                <Logo size={112} rounded />
              </View>
              <Text style={styles.brand}>SAHAL SHOP</Text>
              <Text style={styles.tagline}>Votre boutique, simplement.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Connexion</Text>
              <Text style={styles.cardSubtitle}>
                Accédez à votre espace de gestion.
              </Text>

              <Input
                label="Identifiant"
                value={username}
                onChangeText={(value) => {
                  setUsername(value);
                  setError("");
                }}
                placeholder="Ex. cherif"
                icon="person-outline"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />

              <Input
                label="Mot de passe"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError("");
                }}
                placeholder="Votre mot de passe"
                icon="lock-closed-outline"
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                onRightIconPress={() => setShowPassword((value) => !value)}
                returnKeyType="go"
                onSubmitEditing={submit}
              />

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={17} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title="Se connecter"
                onPress={submit}
                loading={loading}
                icon="arrow-forward"
                style={{ marginTop: spacing.sm }}
              />

              <Pressable
                onPress={() => {
                  setServerUrl(apiUrl);
                  setServerOpen(true);
                }}
                style={styles.serverLink}
              >
                <Ionicons name="server-outline" size={14} color={colors.muted} />
                <Text style={styles.serverText} numberOfLines={1}>
                  Serveur : {apiUrl || "non configuré"}
                </Text>
                <Ionicons name="settings-outline" size={14} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={styles.footer}>
              Mot de passe oublié ? Contactez l'administrateur de la boutique.
            </Text>
            <Text style={styles.version}>SAHAL SHOP • v1.0.0</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ModalSheet
        visible={serverOpen}
        onClose={() => setServerOpen(false)}
        title="Adresse du serveur"
        footer={
          <Button
            title="Enregistrer l'adresse"
            onPress={saveServer}
            loading={savingServer}
            icon="save-outline"
          />
        }
      >
        <Text style={styles.modalText}>
          Utilisez l'adresse de l'API, terminée par <Text style={styles.mono}>/api</Text>.
          En développement local, saisissez l'IP de l'ordinateur (ex.
          http://192.168.1.10:5000/api).
        </Text>
        <Input
          label="URL de l'API"
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="https://mon-api.exemple.com/api"
          autoCapitalize="none"
          keyboardType="url"
          icon="globe-outline"
        />
        <View style={styles.hintBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.info} />
          <Text style={styles.hintText}>
            L'application mémorise cette adresse sur cet appareil.
          </Text>
        </View>
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  hero: { alignItems: "center", marginBottom: spacing.xl },
  logoFrame: {
    padding: 6,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginBottom: spacing.md,
    ...shadows.floating,
  },
  brand: {
    color: colors.white,
    fontSize: 27,
    fontWeight: font.heavy,
    letterSpacing: 2,
  },
  tagline: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    marginTop: 3,
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.card,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: { fontSize: 22, fontWeight: font.heavy, color: colors.text },
  cardSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
    marginBottom: spacing.lg,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.danger, fontSize: 12, flex: 1 },
  serverLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: spacing.md,
    paddingVertical: 6,
  },
  serverText: { color: colors.muted, fontSize: 10.5, maxWidth: "78%" },
  footer: {
    color: "rgba(255,255,255,0.74)",
    textAlign: "center",
    fontSize: 11.5,
    marginTop: spacing.xl,
    lineHeight: 17,
  },
  version: {
    color: "rgba(255,255,255,0.38)",
    textAlign: "center",
    fontSize: 10,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  modalText: {
    fontSize: 12.5,
    color: colors.muted,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  mono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }) },
  hintBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.infoSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  hintText: { flex: 1, fontSize: 11.5, color: colors.info, lineHeight: 17 },
});
