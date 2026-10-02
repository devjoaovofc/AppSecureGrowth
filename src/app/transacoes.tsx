import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomTabBar from "@/components/bottom-tab-bar";
import { iconeDaCategoria } from "@/constants/category-icons";
import { Palette } from "@/constants/palette";
import {
  formatDateBR,
  formatSigned,
  formatTime,
  listTransactions,
  toDateOnly,
  type Transaction,
  type TxFilter,
} from "@/services/transactions.service";

const FILTROS: { chave: TxFilter; label: string }[] = [
  { chave: "all", label: "todas" },
  { chave: "income", label: "receitas" },
  { chave: "expense", label: "despesas" },
];

// tira acento e maiúscula pra a busca achar "alimentacao" ou "Alimentação"
const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Agrupa a lista (já ordenada por data desc) em HOJE / ONTEM / dd/mm/aaaa
function agruparPorDia(lista: Transaction[]) {
  const hoje = toDateOnly(new Date());
  const ontemData = new Date();
  ontemData.setDate(ontemData.getDate() - 1);
  const ontem = toDateOnly(ontemData);

  const grupos: { rotulo: string; itens: Transaction[] }[] = [];
  for (const t of lista) {
    const rotulo =
      t.transaction_date === hoje
        ? "HOJE"
        : t.transaction_date === ontem
          ? "ONTEM"
          : formatDateBR(t.transaction_date);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.rotulo === rotulo) ultimo.itens.push(t);
    else grupos.push({ rotulo, itens: [t] });
  }
  return grupos;
}

export default function TransacoesScreen() {
  const [filtro, setFiltro] = useState<TxFilter>("all");
  const [busca, setBusca] = useState("");
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setTransacoes(await listTransactions(filtro));
    } catch {
      setErro("Não foi possível carregar as transações.");
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  // recarrega ao voltar das telas de adicionar/detalhes e ao trocar o filtro
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const termo = normalizar(busca.trim());
  const visiveis = termo
    ? transacoes.filter(
        (t) =>
          normalizar(t.description).includes(termo) ||
          normalizar(t.category?.name ?? "").includes(termo)
      )
    : transacoes;
  const grupos = agruparPorDia(visiveis);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.titulo}>Transações</Text>

        <View style={styles.buscaBox}>
          <Ionicons name="search" size={22} color={Palette.roxoVibrante} />
          <TextInput
            style={styles.buscaInput}
            placeholder="buscar transação"
            placeholderTextColor={Palette.cinzaTexto}
            value={busca}
            onChangeText={setBusca}
            returnKeyType="search"
          />
        </View>

        <View style={styles.chipsRow}>
          {FILTROS.map((f) => {
            const ativo = f.chave === filtro;
            return (
              <TouchableOpacity
                key={f.chave}
                style={[styles.chip, ativo && styles.chipAtivo]}
                onPress={() => setFiltro(f.chave)}
              >
                <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <View style={styles.filtroIcone}>
            <Ionicons name="options-outline" size={22} color={Palette.roxoVibrante} />
          </View>
        </View>

        {carregando ? (
          <ActivityIndicator
            style={{ marginTop: 40 }}
            size="large"
            color={Palette.roxoVibrante}
          />
        ) : erro ? (
          <View style={styles.vazio}>
            <Ionicons name="cloud-offline-outline" size={26} color={Palette.cinzaTexto} />
            <Text style={styles.vazioTexto}>{erro}</Text>
            <TouchableOpacity onPress={carregar}>
              <Text style={styles.link}>Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        ) : grupos.length === 0 ? (
          <View style={styles.vazio}>
            <Ionicons name="receipt-outline" size={26} color={Palette.cinzaTexto} />
            <Text style={styles.vazioTexto}>
              {termo ? "Nada encontrado pra essa busca" : "Nenhuma transação ainda"}
            </Text>
            {!termo && (
              <TouchableOpacity onPress={() => router.push("/adicionar-transacao")}>
                <Text style={styles.link}>Adicionar a primeira</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          grupos.map((grupo) => (
            <View key={grupo.rotulo}>
              <Text style={styles.grupoRotulo}>{grupo.rotulo}</Text>
              {grupo.itens.map((t, i) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.linha, i !== grupo.itens.length - 1 && styles.linhaDivisor]}
                  onPress={() =>
                    router.push({
                      pathname: "/detalhes-transacao",
                      params: { id: t.id },
                    })
                  }
                >
                  <View style={styles.iconeBox}>
                    <Ionicons
                      name={iconeDaCategoria(t.category?.icon, t.type)}
                      size={22}
                      color={Palette.roxoVibrante}
                    />
                  </View>
                  <View style={styles.linhaInfo}>
                    <Text style={styles.linhaTitulo} numberOfLines={1}>
                      {t.description}
                    </Text>
                    <Text style={styles.linhaSub} numberOfLines={1}>
                      {t.category?.name ?? (t.type === "income" ? "Receita" : "Despesa")},{" "}
                      {formatTime(t.created_at)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.linhaValor,
                      { color: t.type === "income" ? Palette.verdeEntrada : Palette.roxoVibrante },
                    ]}
                  >
                    {formatSigned(t.amount, t.type as "income" | "expense")}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={Palette.textoEscuro} />
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/adicionar-transacao")}
      >
        <Ionicons name="add" size={28} color={Palette.branco} />
      </TouchableOpacity>

      <BottomTabBar ativa="transacoes" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.branco },
  scroll: { padding: 24, paddingBottom: 180 },
  titulo: { fontSize: 24, fontWeight: "800", color: Palette.fundoEscuro, marginTop: 8, marginBottom: 20 },
  buscaBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Palette.lavanda,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 52,
  },
  buscaInput: { flex: 1, fontSize: 14, color: Palette.textoEscuro },
  chipsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, marginBottom: 20 },
  chip: {
    paddingHorizontal: 22,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.lavanda,
    alignItems: "center",
    justifyContent: "center",
  },
  chipAtivo: { backgroundColor: Palette.roxoVibrante },
  chipTexto: { fontSize: 13, fontWeight: "600", color: Palette.roxoVibrante },
  chipTextoAtivo: { color: Palette.branco },
  filtroIcone: {
    marginLeft: "auto",
    width: 46,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.lavanda,
    alignItems: "center",
    justifyContent: "center",
  },
  grupoRotulo: { fontSize: 12, color: Palette.cinzaTexto, marginTop: 8, marginBottom: 6, letterSpacing: 0.5 },
  linha: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  linhaDivisor: { borderBottomWidth: 1, borderBottomColor: "#ECEBF3" },
  iconeBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.lavanda,
    alignItems: "center",
    justifyContent: "center",
  },
  linhaInfo: { flex: 1 },
  linhaTitulo: { fontSize: 15, fontWeight: "700", color: Palette.textoEscuro },
  linhaSub: { fontSize: 12, color: Palette.cinzaTexto, marginTop: 2 },
  linhaValor: { fontSize: 13, fontWeight: "700" },
  vazio: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
    backgroundColor: "#F8F7FC",
    borderRadius: 20,
  },
  vazioTexto: { color: Palette.cinzaTexto, fontSize: 13, fontWeight: "600" },
  link: { color: Palette.roxoVibrante, fontSize: 13, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 108,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Palette.roxoVibrante,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Palette.roxoVibrante,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
