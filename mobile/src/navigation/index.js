import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { colors, font } from "../theme";

import ArticleDetailScreen from "../screens/ArticleDetailScreen";
import ArticleFormScreen from "../screens/ArticleFormScreen";
import ArticlesScreen from "../screens/ArticlesScreen";
import CustomerDetailScreen from "../screens/CustomerDetailScreen";
import CustomersScreen from "../screens/CustomersScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ExpensesScreen from "../screens/ExpensesScreen";
import LoginScreen from "../screens/LoginScreen";
import LossesScreen from "../screens/LossesScreen";
import MoreScreen from "../screens/MoreScreen";
import NewSaleScreen from "../screens/NewSaleScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SaleDetailScreen from "../screens/SaleDetailScreen";
import SalesScreen from "../screens/SalesScreen";
import UsersScreen from "../screens/UsersScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Dashboard: ["speedometer", "speedometer-outline"],
  Stock: ["cube", "cube-outline"],
  Sales: ["receipt", "receipt-outline"],
  Clients: ["people", "people-outline"],
  More: ["grid", "grid-outline"],
};

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 9.5,
          fontWeight: font.semibold,
          marginTop: 1,
        },
        tabBarStyle: {
          paddingTop: 6,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarIcon: ({ color, focused }) => {
          const [active, inactive] = TAB_ICONS[route.name] || TAB_ICONS.More;
          return (
            <Ionicons
              name={focused ? active : inactive}
              size={focused ? 23 : 22}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Accueil" }} />
      <Tab.Screen name="Stock" component={ArticlesScreen} options={{ title: "Stock" }} />
      <Tab.Screen name="Sales" component={SalesScreen} options={{ title: "Ventes" }} />
      <Tab.Screen name="Clients" component={CustomersScreen} options={{ title: "Clients" }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: "Plus" }} />
    </Tab.Navigator>
  );
}

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.primary,
  headerTitleStyle: {
    color: colors.text,
    fontWeight: font.bold,
    fontSize: 16,
  },
  headerShadowVisible: true,
  contentStyle: { backgroundColor: colors.background },
  animation: "slide_from_right",
};

export default function RootNavigator() {
  const { isAuthenticated, initializing } = useAuth();

  // L'écran de démarrage natif reste affiché pendant la restauration de session.
  if (initializing) return null;

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false, animation: "fade" }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false, animation: "fade" }}
          />
          <Stack.Screen
            name="NewSale"
            component={NewSaleScreen}
            options={{ title: "Nouvelle vente" }}
          />
          <Stack.Screen
            name="SaleDetail"
            component={SaleDetailScreen}
            options={{ title: "Vente" }}
          />
          <Stack.Screen
            name="ArticleDetail"
            component={ArticleDetailScreen}
            options={{ title: "Article" }}
          />
          <Stack.Screen
            name="ArticleForm"
            component={ArticleFormScreen}
            options={{ title: "Article", presentation: "modal" }}
          />
          <Stack.Screen
            name="CustomerDetail"
            component={CustomerDetailScreen}
            options={{ title: "Client" }}
          />
          <Stack.Screen
            name="Expenses"
            component={ExpensesScreen}
            options={{ title: "Dépenses" }}
          />
          <Stack.Screen
            name="Losses"
            component={LossesScreen}
            options={{ title: "Pertes d'articles" }}
          />
          <Stack.Screen
            name="Users"
            component={UsersScreen}
            options={{ title: "Utilisateurs" }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: "Mon profil" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
