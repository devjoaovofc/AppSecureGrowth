import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleEntrar() {
    if (!email.trim() || !senha.trim()) {
      Alert.alert("Campos obrigatórios", "Preenche e-mail e senha.");
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setCarregando(false);

    if (error) {
      Alert.alert("Erro ao entrar", error.message);
      return;
    }

    router.replace("/dashboard"); 
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Bem-vindo de volta</Text>
          <Text style={styles.subtitle}>
            Entre para continuar controlando suas finanças
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="seuemail@gmail.com"
            placeholderTextColor="#A0A0B8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />

          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleEntrar}
            disabled={carregando}
          >
            {carregando ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>ou continue com</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton} onPress={() => {}}>
              <Image
                source={require("../../assets/images/apple.png")}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => {}}>
              <Image
                source={require("../../assets/images/google.png")}
                style={styles.socialIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem conta? </Text>
          <Link href="/cadastro" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Cadastre-se</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  header: {
    backgroundColor: "#E9E3F7",
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 60,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 20,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.9,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#1F1B3A" },
  subtitle: { fontSize: 14, color: "#6B6B80", marginTop: 6 },
  form: { paddingHorizontal: 24, marginTop: 32 },
  label: { fontSize: 14, fontWeight: "700", color: "#1F1B3A", marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: "#7C3AED",
    backgroundColor: "#F5F2FC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1F1B3A",
    marginBottom: 20,
  },
  forgotWrap: { alignItems: "flex-end", marginBottom: 24 },
  forgotText: { color: "#7C3AED", fontWeight: "600", fontSize: 13 },
  button: {
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 24,
  },
  divider: { flex: 1, height: 1, backgroundColor: "#E5E1F0" },
  dividerText: { marginHorizontal: 12, color: "#9A9AAE", fontSize: 13 },
  socialRow: { flexDirection: "row", justifyContent: "center", gap: 24 },
  socialButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#EEEBF7",
    alignItems: "center",
    justifyContent: "center",
  },
  socialIcon: { width: 26, height: 26 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
  },
  footerText: { color: "#6B6B80", fontSize: 14 },
  footerLink: { color: "#7C3AED", fontWeight: "700", fontSize: 14 },
});