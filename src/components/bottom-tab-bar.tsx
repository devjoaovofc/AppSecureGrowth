import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Palette } from "@/constants/palette";

type Aba = "home" | "transacoes" | "historico" | "relatorios" | "perfil";

const ABAS: {
  chave: Aba;
  ativo: keyof typeof Ionicons.glyphMap;
  inativo: keyof typeof Ionicons.glyphMap;
  rota?: "/dashboard" | "/transacoes";
}[] = [
  { chave: "home", ativo: "home", inativo: "home-outline", rota: "/dashboard" },
  { chave: "transacoes", ativo: "cart", inativo: "cart-outline", rota: "/transacoes" },
  { chave: "historico", ativo: "time", inativo: "time-outline" },
  { chave: "relatorios", ativo: "stats-chart", inativo: "stats-chart-outline" },
  { chave: "perfil", ativo: "person", inativo: "person-outline" },
];

// Barra inferior compartilhada. Só Home e Transações navegam por enquanto;
// as outras abas ganham rota quando as telas dos colegas ficarem prontas.
export default function BottomTabBar({ ativa }: { ativa: Aba }) {
  return (
    <View style={styles.tabBar}>
      {ABAS.map((aba) => {
        const selecionada = aba.chave === ativa;
        return (
          <TouchableOpacity
            key={aba.chave}
            style={[styles.tabButton, selecionada && styles.tabButtonActive]}
            onPress={() => {
              if (!aba.rota || selecionada) return;
              router.replace(aba.rota);
            }}
          >
            <Ionicons
              name={selecionada ? aba.ativo : aba.inativo}
              size={22}
              color={selecionada ? Palette.roxoVibrante : "#1F1B3A"}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  tabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: { backgroundColor: "#F3F1FA" },
});
