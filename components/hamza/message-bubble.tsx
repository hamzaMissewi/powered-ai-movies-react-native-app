import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  role: "user" | "assistant";
  text: string;
};

export default function MessageBubble({ role, text }: Props) {
  const isUser = role === "user";
  return (
    <View style={[styles.container, isUser ? styles.user : styles.assistant]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 12,
    maxWidth: "85%",
  },
  user: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6", // light green
  },
  assistant: {
    alignSelf: "flex-start",
    backgroundColor: "#F0F0F0",
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
});
