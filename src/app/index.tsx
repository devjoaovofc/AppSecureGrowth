import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

export default function SplashScreen() {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace("/login");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../../assets/images/logo.png")}
        style={[styles.logo, { transform: [{ scale }], opacity }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2D1155",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 120,
    shadowColor: "#7C3AED",
    shadowOpacity: 1,
    shadowRadius: 35,
    shadowOffset: { width: 0, height: 0 },
    elevation: 24,
  },
});