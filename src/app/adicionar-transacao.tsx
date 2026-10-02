import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { iconeDaCategoria } from "@/constants/category-icons";
import { Palette } from "@/constants/palette";
import {
  createTransaction,
  formatDateBR,
  getTransaction,
  listCategories,
  parseBRL,
  toDateOnly,
  updateTransaction,
  type Category,
  type TxKind,
} from "@/services/transactions.service";

// "14082026" -> "14/08/2026"
function mascararData(texto: string) {
  const d = texto.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// "14/08/2026" -> "2026-08-14" (ou null se a data não existir)
function dataParaISO(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = Number(dd);
  const mo = Number(mm);
  const y = Number(yyyy);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdicionarTransacaoScreen() {
  // com ?id=... a mesma tela vira "editar" (usada pelo botão Editar dos detalhes)
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editando = !!id;

  const [tipo, setTipo] = useState<TxKind>("expense");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [data, setData] = useState(formatDateBR(toDateOnly(new Date())));
  const [observacao, setObservacao] = useState("");

  const [categorias, setCategorias] = useState<Category[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [carregandoInicial, setCarregandoInicial] = useState(editando);

  // modo edição: preenche o formulário com a transação existente
  useEffect(() => {
    if (!id) return;
    getTransaction(id)
      .then((t) => {
        setTipo(t.type);
        setValor(t.amount.toFixed(2).replace(".", ","));
        setDescricao(t.description);
        setCategoriaId(t.category_id);
        setData(formatDateBR(t.transaction_date));
        setObservacao(t.notes ?? "");
      })
      .catch(() => Alert.alert("Erro", "Não foi possível carregar a transação."))
      .finally(() => setCarregandoInicial(false));
  }, [id]);

  // categorias mudam conforme o toggle saída/entrada
  useEffect(() => {
    if (carregandoInicial) return;
    let ativo = true;
    listCategories(tipo)
      .then((lista) => {
        if (!ativo) return;
        setCategorias(lista);
        setCategoriaId((atual) => {
          if (atual && lista.some((c) => c.id === atual)) return atual;
          const padrao =
            lista.find((c) => c.name === (tipo === "expense" ? "Alimentação" : "Salário")) ??
            lista[0];
          return padrao?.id ?? null;
        });
      })
      .catch(() => Alert.alert("Erro", "Não foi possível carregar as categorias."));
    return () => {
      ativo = false;
    };
  }, [tipo, carregandoInicial]);

  function onChangeValor(texto: string) {
    let limpo = texto.replace(/\./g, ",").replace(/[^\d,]/g, "");
    const partes = limpo.split(",");
    if (partes.length > 2) limpo = partes[0] + "," + partes.slice(1).join("");
    const [inteiro, decimal] = limpo.split(",");
    setValor(decimal !== undefined ? `${inteiro},${decimal.slice(0, 2)}` : inteiro);
  }

  async function confirmar() {
    const valorNum = parseBRL(valor);
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      Alert.alert("Valor inválido", "Informe um valor maior que zero.");
      return;
    }
    if (!descricao.trim()) {
      Alert.alert("Falta a descrição", "Ex: mercado, salário...");
      return;
    }
    const iso = dataParaISO(data);
    if (!iso) {
      Alert.alert("Data inválida", "Use o formato DD/MM/AAAA.");
      return;
    }

    const payload = {
      type: tipo,
      description: descricao,
      amount: valorNum,
      category_id: categoriaId,
      transaction_date: iso,
      notes: observacao,
    };

    setSalvando(true);
    try {
      if (id) await updateTransaction(id, payload);
      else await createTransaction(payload);
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Tente novamente.";
      Alert.alert("Erro ao salvar", msg);
    } finally {
      setSalvando(false);
    }
  }

  const categoriaAtual = categorias.find((c) => c.id === categoriaId);

  if (carregandoInicial) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={Palette.roxoVibrante} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.voltar} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={Palette.textoEscuro} />
            </TouchableOpacity>
            <Text style={styles.headerTitulo}>
              {editando ? "Editar transação" : "Adicionar transação"}
            </Text>
            <View style={styles.voltar} />
          </View>

          <View style={styles.valorCard}>
            <View style={styles.toggle}>
              {(
                [
                  { chave: "expense", label: "saída" },
                  { chave: "income", label: "entrada" },
                ] as const
              ).map((op) => {
                const ativo = tipo === op.chave;
                return (
                  <TouchableOpacity
                    key={op.chave}
                    style={[styles.togglePill, ativo && styles.togglePillAtivo]}
                    onPress={() => setTipo(op.chave)}
                  >
                    <Text style={[styles.toggleTexto, ativo && styles.toggleTextoAtivo]}>
                      {op.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.rotulo}>valor</Text>
            <View style={styles.valorRow}>
              <Text style={styles.valorPrefixo}>R$</Text>
              <TextInput
                style={styles.valorInput}
                value={valor}
                onChangeText={onChangeValor}
                placeholder="0,00"
                placeholderTextColor={Palette.fundoEscuro}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Text style={styles.rotulo}>descrição</Text>
          <TextInput
            style={styles.campo}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="ex: mercado, salário..."
            placeholderTextColor={Palette.cinzaTexto}
          />

          <Text style={styles.rotulo}>categoria</Text>
          <TouchableOpacity style={styles.campoLinha} onPress={() => setModalAberto(true)}>
            <View style={styles.categoriaIcone}>
              <Ionicons
                name={iconeDaCategoria(categoriaAtual?.icon, tipo)}
                size={20}
                color={Palette.roxoVibrante}
              />
            </View>
            <Text style={styles.categoriaNome}>
              {categoriaAtual?.name ?? "Selecionar categoria"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={Palette.cinzaTexto} />
          </TouchableOpacity>

          <Text style={styles.rotulo}>data</Text>
          <TextInput
            style={styles.campo}
            value={data}
            onChangeText={(t) => setData(mascararData(t))}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={Palette.cinzaTexto}
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={styles.rotulo}>observação (opcional)</Text>
          <TextInput
            style={[styles.campo, { minHeight: 80, textAlignVertical: "top", paddingTop: 14 }]}
            value={observacao}
            onChangeText={setObservacao}
            placeholder="ex: supermercado Pão de Açúcar"
            placeholderTextColor={Palette.cinzaTexto}
            multiline
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.botao, salvando && { opacity: 0.7 }]}
            onPress={confirmar}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color={Palette.branco} />
            ) : (
              <Text style={styles.botaoTexto}>{editando ? "Salvar" : "Confirmar"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={modalAberto}
        transparent
        animationType="slide"
        onRequestClose={() => setModalAberto(false)}
      >
        <Pressable style={styles.modalFundo} onPress={() => setModalAberto(false)}>
          <Pressable style={styles.modalFolha} onPress={() => {}}>
            <Text style={styles.modalTitulo}>Categoria</Text>
            <ScrollView>
              {categorias.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setCategoriaId(c.id);
                    setModalAberto(false);
                  }}
                >
                  <View style={styles.categoriaIcone}>
                    <Ionicons
                      name={iconeDaCategoria(c.icon, tipo)}
                      size={20}
                      color={Palette.roxoVibrante}
                    />
                  </View>
                  <Text style={styles.categoriaNome}>{c.name}</Text>
                  {c.id === categoriaId && (
                    <Ionicons name="checkmark" size={20} color={Palette.roxoVibrante} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.branco },
  scroll: { padding: 24, paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  voltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.lavanda,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitulo: { fontSize: 16, fontWeight: "800", color: Palette.fundoEscuro },
  valorCard: { backgroundColor: Palette.lavanda, borderRadius: 20, padding: 18, marginBottom: 8 },
  toggle: { position: "absolute", right: 14, top: 12, flexDirection: "row", gap: 6 },
  togglePill: { paddingHorizontal: 14, height: 26, borderRadius: 13, backgroundColor: Palette.branco, alignItems: "center", justifyContent: "center" },
  togglePillAtivo: { backgroundColor: Palette.roxoVibrante },
  toggleTexto: { fontSize: 11, fontWeight: "600", color: Palette.cinzaTexto },
  toggleTextoAtivo: { color: Palette.branco },
  valorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  valorPrefixo: { fontSize: 28, fontWeight: "800", color: Palette.fundoEscuro },
  valorInput: { flex: 1, fontSize: 28, fontWeight: "800", color: Palette.fundoEscuro, padding: 0 },
  rotulo: { fontSize: 12, fontWeight: "600", color: Palette.cinzaTexto, marginTop: 14, marginBottom: 6 },
  campo: {
    backgroundColor: Palette.lavanda,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 14,
    color: Palette.textoEscuro,
  },
  campoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Palette.lavanda,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 52,
  },
  categoriaIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DDD6FB",
    alignItems: "center",
    justifyContent: "center",
  },
  categoriaNome: { flex: 1, fontSize: 15, color: Palette.textoEscuro },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  botao: {
    height: 52,
    borderRadius: 18,
    backgroundColor: Palette.roxoVibrante,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoTexto: { color: Palette.branco, fontSize: 16, fontWeight: "800" },
  modalFundo: { flex: 1, backgroundColor: "rgba(20,9,31,0.5)", justifyContent: "flex-end" },
  modalFolha: {
    backgroundColor: Palette.branco,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "70%",
  },
  modalTitulo: { fontSize: 16, fontWeight: "800", color: Palette.fundoEscuro, marginBottom: 12 },
  modalItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
});
