import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { iconeDaCategoria } from "@/constants/category-icons";
import { Palette } from "@/constants/palette";
import {
  deleteTransaction,
  formatDateBR,
  formatSigned,
  formatTime,
  getTransaction,
  type Transaction,
} from "@/services/transactions.service";

export default function DetalhesTransacaoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [t, setT] = useState<Transaction | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);

  // recarrega ao voltar da tela de edição
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let ativo = true;
      getTransaction(id)
        .then((dados) => ativo && setT(dados))
        .catch(() => ativo && setT(null))
        .finally(() => ativo && setCarregando(false));
      return () => {
        ativo = false;
      };
    }, [id])
  );

  function confirmarExclusao() {
    Alert.alert("Excluir transação", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            setExcluindo(true);
            await deleteTransaction(id);
            router.back();
          } catch {
            setExcluindo(false);
            Alert.alert("Erro", "Não foi possível excluir. Tente novamente.");
          }
        },
      },
    ]);
  }

  const cabecalho = (
    <View style={styles.header}>
      <TouchableOpacity style={styles.voltar} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={22} color={Palette.textoEscuro} />
      </TouchableOpacity>
      <Text style={styles.headerTitulo}>Detalhes</Text>
      <View style={styles.voltar} />
    </View>
  );

  if (carregando) {
    return (
      <SafeAreaView style={styles.safe}>
        {cabecalho}
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Palette.roxoVibrante} />
      </SafeAreaView>
    );
  }

  if (!t) {
    return (
      <SafeAreaView style={styles.safe}>
        {cabecalho}
        <Text style={styles.naoEncontrada}>Transação não encontrada.</Text>
      </SafeAreaView>
    );
  }

  const tipo = t.type as "income" | "expense";
  const categoria = t.category?.name ?? (tipo === "income" ? "Receita" : "Despesa");

  return (
    <SafeAreaView style={styles.safe}>
      {cabecalho}

      <View style={styles.card}>
        <View style={styles.cardIcone}>
          <Ionicons
            name={iconeDaCategoria(t.category?.icon, tipo)}
            size={26}
            color={Palette.branco}
          />
        </View>
        <Text style={styles.cardDescricao} numberOfLines={2}>
          {t.description}
        </Text>
        <Text style={styles.cardValor}>{formatSigned(t.amount, tipo)}</Text>
        <View style={styles.cardPill}>
          <Text style={styles.cardPillTexto}>{categoria}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={[styles.infoLinha, styles.infoDivisor]}>
          <Text style={styles.infoRotulo}>data</Text>
          <Text style={styles.infoValor}>
            {formatDateBR(t.transaction_date)}, {formatTime(t.created_at)}
          </Text>
        </View>
        <View style={[styles.infoLinha, styles.infoDivisor]}>
          <Text style={styles.infoRotulo}>categoria</Text>
          <Text style={styles.infoValor}>{categoria}</Text>
        </View>
        <View style={styles.infoLinha}>
          <Text style={styles.infoRotulo}>observação</Text>
          <Text style={[styles.infoValor, { flex: 1 }]}>{t.notes || "—"}</Text>
        </View>
      </View>

      <View style={styles.botoes}>
        <TouchableOpacity
          style={[styles.botao, styles.botaoEditar]}
          onPress={() =>
            router.push({ pathname: "/adicionar-transacao", params: { id: t.id } })
          }
        >
          <Text style={styles.botaoEditarTexto}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.botao, styles.botaoExcluir, excluindo && { opacity: 0.6 }]}
          onPress={confirmarExclusao}
          disabled={excluindo}
        >
          <Text style={styles.botaoExcluirTexto}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.branco, paddingHorizontal: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 20 },
  voltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.lavanda,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitulo: { fontSize: 16, fontWeight: "800", color: Palette.fundoEscuro },
  naoEncontrada: { textAlign: "center", marginTop: 60, color: Palette.cinzaTexto, fontWeight: "600" },
  card: {
    backgroundColor: Palette.fundoEscuro,
    borderRadius: 28,
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 10,
  },
  cardIcone: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  cardDescricao: { color: Palette.branco, fontSize: 14, fontWeight: "600", textAlign: "center" },
  cardValor: { color: Palette.branco, fontSize: 36, fontWeight: "800" },
  cardPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  cardPillTexto: { color: Palette.branco, fontSize: 12, fontWeight: "600" },
  infoCard: {
    backgroundColor: Palette.lavanda,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginTop: 24,
  },
  infoLinha: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingVertical: 12 },
  infoDivisor: { borderBottomWidth: 1, borderBottomColor: "#DDD6FB" },
  infoRotulo: { fontSize: 12, color: Palette.cinzaTexto, fontWeight: "600" },
  infoValor: { fontSize: 13, color: Palette.textoEscuro, fontWeight: "700", textAlign: "right" },
  botoes: { flexDirection: "row", gap: 14, marginTop: "auto", marginBottom: 16 },
  botao: { height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  botaoEditar: { flex: 1, backgroundColor: Palette.roxoVibrante },
  botaoEditarTexto: { color: Palette.branco, fontSize: 15, fontWeight: "800" },
  botaoExcluir: {
    flex: 1.3,
    backgroundColor: Palette.vermelhoFundo,
    borderWidth: 1,
    borderColor: Palette.vermelhoAlerta,
  },
  botaoExcluirTexto: { color: Palette.vermelhoAlerta, fontSize: 15, fontWeight: "800" },
});
