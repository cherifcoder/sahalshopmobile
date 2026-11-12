import { Ionicons } from "@expo/vector-icons";
import { useEffect, useLayoutEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { articleApi } from "../api/services";
import {
  Badge,
  Button,
  Card,
  Chip,
  Input,
  LoadingView,
  Screen,
  SectionHeader,
} from "../components";
import { colors, font, radius, spacing } from "../theme";
import { formatMoney } from "../utils/format";

const CATEGORY_SUGGESTIONS = [
  "Alimentation",
  "Boissons",
  "Hygiène",
  "Papeterie",
  "Cosmétique",
  "Vêtements",
  "Électronique",
  "Divers",
];

const EMPTY_FORM = {
  name: "",
  sku: "",
  category: "Divers",
  description: "",
  purchasePrice: "",
  salePrice: "",
  stock: "0",
  alertThreshold: "5",
  unit: "pièce",
  active: true,
};

export default function ArticleFormScreen({ navigation, route }) {
  const id = route.params?.id;
  const isEdit = Boolean(id);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? "Modifier l'article" : "Nouvel article" });
  }, [navigation, isEdit]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const response = await articleApi.get(id);
        const article = response.article;
        setForm({
          name: article.name || "",
          sku: article.sku || "",
          category: article.category || "Divers",
          description: article.description || "",
          purchasePrice: String(article.purchasePrice ?? ""),
          salePrice: String(article.salePrice ?? ""),
          stock: String(article.stock ?? 0),
          alertThreshold: String(article.alertThreshold ?? 5),
          unit: article.unit || "pièce",
          active: article.active !== false,
        });
      } catch (err) {
        setError(err.message || "Impossible de charger l'article.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const margin =
    Number(form.salePrice || 0) - Number(form.purchasePrice || 0);
  const marginRate =
    Number(form.purchasePrice) > 0
      ? Math.round((margin / Number(form.purchasePrice)) * 100)
      : 0;

  const save = async () => {
    setError("");
    if (!form.name.trim()) return setError("Le nom de l'article est requis.");
    if (form.purchasePrice === "" || form.salePrice === "") {
      return setError("Les prix d'achat et de vente sont requis.");
    }
    if (Number(form.purchasePrice) < 0 || Number(form.salePrice) < 0) {
      return setError("Les prix ne peuvent pas être négatifs.");
    }
    if (!isEdit && Number(form.stock) < 0) {
      return setError("Le stock initial ne peut pas être négatif.");
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        category: form.category.trim() || "Divers",
        description: form.description.trim(),
        purchasePrice: Number(form.purchasePrice),
        salePrice: Number(form.salePrice),
        alertThreshold: Number(form.alertThreshold) || 0,
        unit: form.unit.trim() || "pièce",
        active: form.active,
      };
      if (isEdit) {
        await articleApi.update(id, payload);
      } else {
        await articleApi.create({ ...payload, stock: Number(form.stock) || 0 });
      }
      navigation.goBack();
    } catch (err) {
      setError(err.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert(
      "Archiver cet article ?",
      "Il ne sera plus proposé à la vente. Son historique sera conservé.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Archiver",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await articleApi.remove(id);
              navigation.goBack();
            } catch (err) {
              Alert.alert("Erreur", err.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <Screen scroll={false}>
        <LoadingView label="Chargement de l'article…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card style={styles.intro}>
        <View style={styles.introIcon}>
          <Ionicons name="cube-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.introTitle}>
            {isEdit ? "Informations de l'article" : "Ajouter un nouvel article"}
          </Text>
          <Text style={styles.introText}>
            Renseignez les prix pour calculer automatiquement votre marge.
          </Text>
        </View>
      </Card>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={17} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <SectionHeader title="Identification" />
      <Input
        label="Nom de l'article *"
        value={form.name}
        onChangeText={set("name")}
        placeholder="Ex. Sac de riz 25 kg"
        icon="pricetag-outline"
        autoCapitalize="sentences"
      />
      <View style={styles.row}>
        <Input
          label="Code / SKU"
          value={form.sku}
          onChangeText={set("sku")}
          placeholder="Optionnel"
          autoCapitalize="characters"
          style={{ flex: 1 }}
        />
        <Input
          label="Unité"
          value={form.unit}
          onChangeText={set("unit")}
          placeholder="pièce, sac, kg…"
          autoCapitalize="none"
          style={{ flex: 1 }}
        />
      </View>
      <Input
        label="Catégorie"
        value={form.category}
        onChangeText={set("category")}
        placeholder="Ex. Alimentation"
        icon="grid-outline"
        autoCapitalize="sentences"
      />
      <View style={styles.suggestions}>
        {CATEGORY_SUGGESTIONS.map((category) => (
          <Chip
            key={category}
            label={category}
            active={form.category === category}
            onPress={() => set("category")(category)}
          />
        ))}
      </View>
      <Input
        label="Description"
        value={form.description}
        onChangeText={set("description")}
        placeholder="Notes internes, référence fournisseur…"
        multiline
        numberOfLines={3}
        autoCapitalize="sentences"
      />

      <SectionHeader title="Prix & marge" />
      <View style={styles.row}>
        <Input
          label="Prix d'achat *"
          value={form.purchasePrice}
          onChangeText={set("purchasePrice")}
          placeholder="0"
          keyboardType="numeric"
          icon="download-outline"
          style={{ flex: 1 }}
        />
        <Input
          label="Prix de vente *"
          value={form.salePrice}
          onChangeText={set("salePrice")}
          placeholder="0"
          keyboardType="numeric"
          icon="pricetag-outline"
          style={{ flex: 1 }}
        />
      </View>
      <View style={[styles.marginBox, margin < 0 && styles.marginBoxDanger]}>
        <View>
          <Text style={styles.marginLabel}>Marge unitaire estimée</Text>
          <Text
            style={[
              styles.marginValue,
              { color: margin < 0 ? colors.danger : colors.success },
            ]}
          >
            {formatMoney(margin)} {marginRate ? `(${marginRate}%)` : ""}
          </Text>
        </View>
        <Badge
          label={margin < 0 ? "Vente à perte" : "Marge bénéficiaire"}
          variant={margin < 0 ? "danger" : "success"}
        />
      </View>

      <SectionHeader title="Stock" />
      <View style={styles.row}>
        {!isEdit ? (
          <Input
            label="Stock initial"
            value={form.stock}
            onChangeText={set("stock")}
            placeholder="0"
            keyboardType="numeric"
            icon="cube-outline"
            style={{ flex: 1 }}
          />
        ) : null}
        <Input
          label="Seuil d'alerte"
          value={form.alertThreshold}
          onChangeText={set("alertThreshold")}
          placeholder="5"
          keyboardType="numeric"
          icon="notifications-outline"
          style={{ flex: 1 }}
        />
      </View>
      {isEdit ? (
        <View style={styles.activeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeTitle}>Article actif</Text>
            <Text style={styles.activeText}>
              Désactivez-le pour le retirer de la vente sans perdre l'historique.
            </Text>
          </View>
          <Switch
            value={form.active}
            onValueChange={set("active")}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
      ) : null}

      <Button
        title={isEdit ? "Enregistrer les modifications" : "Créer l'article"}
        icon="checkmark-circle-outline"
        onPress={save}
        loading={saving}
        style={{ marginTop: spacing.lg }}
      />
      {isEdit ? (
        <Button
          title="Archiver l'article"
          icon="trash-outline"
          variant="ghost"
          onPress={remove}
          loading={deleting}
          style={{ marginTop: spacing.sm }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  introTitle: { fontSize: 14, fontWeight: font.bold, color: colors.primary },
  introText: { fontSize: 11.5, color: colors.primaryMid, marginTop: 2, lineHeight: 16 },
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
  row: { flexDirection: "row", gap: spacing.sm },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: -4,
    marginBottom: spacing.md,
  },
  marginBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: -2,
  },
  marginBoxDanger: { backgroundColor: colors.dangerSoft },
  marginLabel: { fontSize: 10.5, color: colors.muted },
  marginValue: { fontSize: 15, fontWeight: font.bold, marginTop: 1 },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  activeTitle: { fontSize: 12.5, fontWeight: font.semibold, color: colors.text },
  activeText: { fontSize: 10.5, color: colors.muted, marginTop: 2, lineHeight: 15 },
});
