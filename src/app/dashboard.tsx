import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

const CHART_HEIGHT = 140;
const MAX_VALOR_MINIMO = 100;

type Meta = {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
};

type Transacao = {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  transaction_date: string;
};

const ICONE_POR_TIPO: Record<string, keyof typeof Ionicons.glyphMap> = {
  income: "arrow-up-circle-outline",
  expense: "arrow-down-circle-outline",
  transfer: "swap-horizontal-outline",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getSaudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia,";
  if (hora < 18) return "Boa tarde,";
  return "Boa noite,";
}

function formatarDataRelativa(dataISO: string) {
  const data = new Date(dataISO + "T00:00:00");
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);

  const mesmoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (mesmoDia(data, hoje)) return "Hoje";
  if (mesmoDia(data, ontem)) return "Ontem";
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function getUltimosMeses(qtd: number) {
  const hoje = new Date();
  const meses = [];
  for (let i = qtd - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const label = d
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "");
    meses.push({
      chave,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    });
  }
  return meses;
}

export default function DashboardScreen() {
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [receitasMes, setReceitasMes] = useState(0);
  const [despesasMes, setDespesasMes] = useState(0);
  const [mesesLabels, setMesesLabels] = useState<string[]>([]);
  const [receitasHist, setReceitasHist] = useState<number[]>([]);
  const [despesasHist, setDespesasHist] = useState<number[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [saldoVisivel, setSaldoVisivel] = useState(true);

  const carregarDados = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const hoje = new Date();
    const primeiroDiaMesAtual = `${hoje.getFullYear()}-${String(
      hoje.getMonth() + 1
    ).padStart(2, "0")}-01`;
    const meses = getUltimosMeses(4);

    const [perfilRes, balancosRes, resumoMesRes, resumoHistRes, metasRes, transacoesRes] =
      await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("account_balances").select("current_balance").eq("user_id", user.id),
        supabase
          .from("monthly_summary")
          .select("total_income,total_expense")
          .eq("user_id", user.id)
          .eq("month", primeiroDiaMesAtual)
          .maybeSingle(),
        supabase
          .from("monthly_summary")
          .select("month,total_income,total_expense")
          .eq("user_id", user.id)
          .gte("month", meses[0].chave),
        supabase
          .from("financial_goals")
          .select("id,name,current_amount,target_amount")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("transactions")
          .select("id,description,amount,type,transaction_date")
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

    setNome(perfilRes.data?.full_name?.split(" ")[0] ?? "");

    const saldo = (balancosRes.data ?? []).reduce(
      (soma, conta) => soma + Number(conta.current_balance),
      0
    );
    setSaldoTotal(saldo);

    setReceitasMes(Number(resumoMesRes.data?.total_income ?? 0));
    setDespesasMes(Number(resumoMesRes.data?.total_expense ?? 0));

    const mapaHistorico = new Map(
      (resumoHistRes.data ?? []).map((linha) => [linha.month, linha])
    );
    setMesesLabels(meses.map((m) => m.label));
    setReceitasHist(
      meses.map((m) => Number(mapaHistorico.get(m.chave)?.total_income ?? 0))
    );
    setDespesasHist(
      meses.map((m) => Number(mapaHistorico.get(m.chave)?.total_expense ?? 0))
    );

    setMetas(
      (metasRes.data ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        current_amount: Number(m.current_amount),
        target_amount: Number(m.target_amount),
      }))
    );

    setTransacoes(transacoesRes.data ?? []);

    setCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [carregarDados])
  );

  if (carregando) {
    return (
      <SafeAreaView style={[styles.safe, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  const maiorValorHistorico = Math.max(
    MAX_VALOR_MINIMO,
    ...receitasHist,
    ...despesasHist
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{getSaudacao()}</Text>
            <Text style={styles.name}>{nome} 👋</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.bellButton}>
              <Ionicons name="notifications-outline" size={22} color="#1F1B3A" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} />
          </View>
        </View>

        <LinearGradient
          colors={["#8B5CF6", "#6D28D9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceTopRow}>
            <Text style={styles.balanceLabel}>Saldo total</Text>
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setSaldoVisivel((v) => !v)}
            >
              <Ionicons
                name={saldoVisivel ? "eye-outline" : "eye-off-outline"}
                size={18}
                color="#1F1B3A"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.balanceValue}>
            {saldoVisivel ? formatarMoeda(saldoTotal) : "R$ ••••••"}
          </Text>

          <View style={styles.balancePillsRow}>
            <View style={styles.pill}>
              <View style={styles.pillIcon}>
                <Ionicons name="arrow-up" size={14} color="#FFF" />
              </View>
              <View>
                <Text style={styles.pillLabel}>Receitas</Text>
                <Text style={styles.pillValue}>
                  {saldoVisivel ? formatarMoeda(receitasMes) : "••••••"}
                </Text>
              </View>
            </View>

            <View style={styles.pill}>
              <View style={styles.pillIcon}>
                <Ionicons name="arrow-down" size={14} color="#FFF" />
              </View>
              <View>
                <Text style={styles.pillLabel}>Despesas</Text>
                <Text style={styles.pillValue}>
                  {saldoVisivel ? formatarMoeda(despesasMes) : "••••••"}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Receitas x despesas</Text>
        </View>

        <LinearGradient
          colors={["#4C1D95", "#3B0764"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chartCard}
        >
          <View style={styles.chartTopRow}>
            <Text style={styles.chartValue}>{formatarMoeda(saldoTotal)}</Text>
          </View>

          <View style={styles.chartArea}>
            <View style={styles.chartBarsRow}>
              {mesesLabels.map((label, index) => (
                <View key={label} style={styles.chartBarGroup}>
                  <View style={styles.chartBarsInner}>
                    <View
                      style={[
                        styles.barDespesa,
                        {
                          height:
                            (despesasHist[index] / maiorValorHistorico) *
                            CHART_HEIGHT,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.barReceita,
                        {
                          height:
                            (receitasHist[index] / maiorValorHistorico) *
                            CHART_HEIGHT,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartMonthLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.chartLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
              <Text style={styles.legendText}>Receitas</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#F87171" }]} />
              <Text style={styles.legendText}>Despesas</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleDark}>Metas</Text>
        </View>

        {metas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="flag-outline" size={22} color="#9A9AAE" />
            <Text style={styles.emptyText}>Você ainda não criou nenhuma meta</Text>
          </View>
        ) : (
          metas.map((meta) => {
            const progresso = Math.min(meta.current_amount / meta.target_amount, 1);
            return (
              <LinearGradient
                key={meta.id}
                colors={["#8B5CF6", "#6D28D9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.goalCard}
              >
                <View style={styles.goalIconBox}>
                  <Ionicons name="flag-outline" size={22} color="#FFF" />
                </View>
                <View style={styles.goalInfo}>
                  <View style={styles.goalTopRow}>
                    <Text style={styles.goalTitle}>{meta.name}</Text>
                    <Text style={styles.goalValue}>
                      {formatarMoeda(meta.current_amount)} /{" "}
                      {formatarMoeda(meta.target_amount)}
                    </Text>
                  </View>
                  <View style={styles.goalProgressTrack}>
                    <View
                      style={[
                        styles.goalProgressFill,
                        { width: `${progresso * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              </LinearGradient>
            );
          })
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleDark}>Últimas transações</Text>
        </View>

        {transacoes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={22} color="#9A9AAE" />
            <Text style={styles.emptyText}>Nenhuma transação registrada ainda</Text>
          </View>
        ) : (
          <LinearGradient
            colors={["#4C1D95", "#3B0764"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.transactionsCard}
          >
            {transacoes.map((t, index) => (
              <View
                key={t.id}
                style={[
                  styles.transactionRow,
                  index !== transacoes.length - 1 && styles.transactionDivider,
                ]}
              >
                <View style={styles.transactionIconBox}>
                  <Ionicons name={ICONE_POR_TIPO[t.type]} size={18} color="#FFF" />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{t.description}</Text>
                  <Text style={styles.transactionDate}>
                    {formatarDataRelativa(t.transaction_date)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionValue,
                    { color: t.type === "expense" ? "#F87171" : "#4ADE80" },
                  ]}
                >
                  {t.type === "expense" ? "- " : ""}
                  {formatarMoeda(Math.abs(Number(t.amount)))}
                </Text>
              </View>
            ))}
          </LinearGradient>
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabButton, styles.tabButtonActive]}>
          <Ionicons name="home" size={22} color="#7C3AED" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => router.replace("/transacoes")}
        >
          <Ionicons name="cart-outline" size={22} color="#1F1B3A" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton}>
          <Ionicons name="time-outline" size={22} color="#1F1B3A" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton}>
          <Ionicons name="stats-chart-outline" size={22} color="#1F1B3A" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton}>
          <Ionicons name="person-outline" size={22} color="#1F1B3A" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  loadingContainer: { alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, paddingBottom: 100 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 14, color: "#6B6B80" },
  name: { fontSize: 18, fontWeight: "700", color: "#1F1B3A", marginTop: 2 },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 12 },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F1FA",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#7C3AED" },
  balanceCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  balanceTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { color: "#EDE9FE", fontSize: 14, fontWeight: "600" },
  eyeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceValue: { color: "#FFF", fontSize: 32, fontWeight: "800", marginTop: 8, marginBottom: 20 },
  balancePillsRow: { flexDirection: "row", gap: 12 },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 12,
  },
  pillIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillLabel: { color: "#EDE9FE", fontSize: 11, fontWeight: "600" },
  pillValue: { color: "#FFF", fontSize: 13, fontWeight: "700", marginTop: 2 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1F1B3A" },
  sectionTitleDark: { fontSize: 18, fontWeight: "800", color: "#1F1B3A" },
  chartCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 28,
    shadowColor: "#4C1D95",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  chartTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  chartValue: { color: "#FFF", fontSize: 26, fontWeight: "800" },
  chartArea: { flexDirection: "row" },
  chartBarsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end" },
  chartBarGroup: { alignItems: "center" },
  chartBarsInner: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: CHART_HEIGHT },
  barReceita: { width: 8, borderRadius: 4, backgroundColor: "#22C55E", minHeight: 2 },
  barDespesa: { width: 8, borderRadius: 4, backgroundColor: "#F87171", minHeight: 2 },
  chartMonthLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 8 },
  chartLegendRow: { flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  goalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  goalInfo: { flex: 1 },
  goalTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  goalTitle: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  goalValue: { color: "#EDE9FE", fontSize: 12, fontWeight: "600" },
  goalProgressTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  goalProgressFill: { height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  transactionsCard: {
    borderRadius: 24,
    padding: 8,
    marginBottom: 16,
    shadowColor: "#4C1D95",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  transactionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  transactionDivider: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  transactionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  transactionInfo: { flex: 1 },
  transactionTitle: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  transactionDate: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  transactionValue: { fontSize: 14, fontWeight: "700" },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 32,
    backgroundColor: "#F8F7FC",
    borderRadius: 20,
    marginBottom: 16,
  },
  emptyText: { color: "#9A9AAE", fontSize: 13, fontWeight: "600" },
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
  tabButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  tabButtonActive: { backgroundColor: "#F3F1FA" },
});