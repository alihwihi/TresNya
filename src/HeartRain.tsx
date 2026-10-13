import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

function FallingHeart({ index }: { index: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 170),
        Animated.timing(progress, {
          toValue: 1,
          duration: 3200 + index * 80,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [index, progress]);
  return (
    <Animated.Text
      style={{
        position: "absolute",
        left: `${(index * 17 + 4) % 94}%`,
        top: -35,
        color: "#d0a0a3",
        fontSize: 18 + (index % 3) * 9,
        opacity: progress.interpolate({
          inputRange: [0, 0.15, 0.8, 1],
          outputRange: [0, 0.85, 0.6, 0],
        }),
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 600],
            }),
          },
          { rotate: `${index % 2 ? -20 : 20}deg` },
        ],
      }}
    >
      ♥
    </Animated.Text>
  );
}
export function HeartRain({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) return null;
  return (
    <View
      pointerEvents="none"
      aria-hidden
      style={[
        StyleSheet.absoluteFill,
        { overflow: "hidden", borderRadius: 27 },
      ]}
    >
      {Array.from({ length: 14 }, (_, index) => (
        <FallingHeart key={index} index={index} />
      ))}
    </View>
  );
}
