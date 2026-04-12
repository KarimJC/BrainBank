import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const SkeletonRow: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.row, { opacity }]}>
      <View style={styles.info}>
        <View style={[styles.bar, { width: 80, height: 14, marginBottom: 6 }]} />
        <View style={[styles.bar, { width: 160, height: 11, marginBottom: 5 }]} />
        <View style={[styles.bar, { width: 60, height: 10, marginBottom: 4 }]} />
        <View style={[styles.bar, { width: 100, height: 10 }]} />
      </View>
      <View style={styles.circle} />
    </Animated.View>
  );
};

export const SkeletonList: React.FC = () => (
  <>
    {Array.from({ length: 7 }).map((_, i) => (
      <React.Fragment key={i}>
        <SkeletonRow />
        <View style={styles.separator} />
      </React.Fragment>
    ))}
  </>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  bar: {
    backgroundColor: '#D1D1D6',
    borderRadius: 6,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1D1D6',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginLeft: 20,
  },
});

export default SkeletonRow;
