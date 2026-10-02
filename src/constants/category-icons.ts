import { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

// O banco guarda o nome do ícone no padrão lucide ('utensils', 'car'...).
// Aqui traduzimos pro equivalente do Ionicons, que é o que o app já usa.
const MAPA: Record<string, IconName> = {
  briefcase: "briefcase-outline",
  laptop: "laptop-outline",
  "trending-up": "trending-up-outline",
  utensils: "restaurant-outline",
  home: "home-outline",
  car: "car-outline",
  "heart-pulse": "heart-outline",
  "book-open": "book-outline",
  "gamepad-2": "game-controller-outline",
  "shopping-cart": "cart-outline",
  receipt: "receipt-outline",
  ellipsis: "ellipsis-horizontal",
};

export function iconeDaCategoria(
  icon: string | null | undefined,
  tipo: "income" | "expense"
): IconName {
  if (icon && MAPA[icon]) return MAPA[icon];
  return tipo === "income" ? "wallet-outline" : "pricetag-outline";
}
