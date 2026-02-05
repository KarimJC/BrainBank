// ==========================================
// app/index.tsx - Splash Screen with Vault Animation + Login
// ==========================================
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import Svg, {
  Circle,
  Line,
  G,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Path,
} from 'react-native-svg';

const { height } = Dimensions.get('window');

const COLORS = {
  white: '#FFFFFF',
  vaultGrey: '#8B8B8B',
  darkGrey: '#5E5E5E',
  darkPurple: '#6B4CE6',
  black: '#1C1C1E',
  mediumGrey: '#636366',
  lightGrey: '#F2F2F7',
};

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

interface VaultDoorProps {
  rotation: Animated.Value;
}

const VaultDoor = ({ rotation }: VaultDoorProps) => {
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <AnimatedSvg
      width={320}
      height={320}
      viewBox="0 0 320 320"
      style={{ transform: [{ rotate: spin }] }}
    >
      <Defs>
        {/* Main door gradient - brushed metal effect */}
        <RadialGradient id="doorGrad" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#E8E8E8" />
          <Stop offset="30%" stopColor="#D0D0D0" />
          <Stop offset="60%" stopColor="#B8B8B8" />
          <Stop offset="100%" stopColor="#909090" />
        </RadialGradient>
        
        {/* Outer ring gradient */}
        <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#C8C8C8" />
          <Stop offset="50%" stopColor="#A0A0A0" />
          <Stop offset="100%" stopColor="#787878" />
        </LinearGradient>
        
        {/* Handle gradient */}
        <LinearGradient id="handleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#A8A8A8" />
          <Stop offset="50%" stopColor="#D0D0D0" />
          <Stop offset="100%" stopColor="#A8A8A8" />
        </LinearGradient>
        
        {/* Spoke gradient */}
        <LinearGradient id="spokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#B0B0B0" />
          <Stop offset="50%" stopColor="#E0E0E0" />
          <Stop offset="100%" stopColor="#B0B0B0" />
        </LinearGradient>
        
        {/* Center hub gradient */}
        <RadialGradient id="hubGrad" cx="40%" cy="40%">
          <Stop offset="0%" stopColor="#E8E8E8" />
          <Stop offset="50%" stopColor="#C0C0C0" />
          <Stop offset="100%" stopColor="#909090" />
        </RadialGradient>
        
        {/* Inner circle gradient */}
        <RadialGradient id="innerGrad" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#D8D8D8" />
          <Stop offset="100%" stopColor="#A0A0A0" />
        </RadialGradient>
      </Defs>

      {/* Outer circle - main door body */}
      <Circle 
        cx="160" 
        cy="160" 
        r="155" 
        fill="url(#doorGrad)" 
        stroke="#707070" 
        strokeWidth="3" 
      />
      
      {/* Outer decorative ring */}
      <Circle 
        cx="160" 
        cy="160" 
        r="145" 
        fill="none" 
        stroke="#606060" 
        strokeWidth="2" 
      />
      
      {/* Tick marks around outer edge */}
      {[...Array(120)].map((_, i) => {
        const angle = (i * 3 * Math.PI) / 180;
        const isLong = i % 10 === 0;
        const r1 = 142;
        const r2 = isLong ? 130 : 136;
        const x1 = 160 + r1 * Math.cos(angle);
        const y1 = 160 + r1 * Math.sin(angle);
        const x2 = 160 + r2 * Math.cos(angle);
        const y2 = 160 + r2 * Math.sin(angle);
        return (
          <Line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#505050"
            strokeWidth={isLong ? 2 : 1}
          />
        );
      })}
      
      {/* Inner circle platform */}
      <Circle 
        cx="160" 
        cy="160" 
        r="115" 
        fill="url(#innerGrad)" 
        stroke="#606060" 
        strokeWidth="2" 
      />
      
      {/* Wheel outer ring */}
      <Circle 
        cx="160" 
        cy="160" 
        r="75" 
        fill="url(#hubGrad)" 
        stroke="#606060" 
        strokeWidth="2" 
      />
      
      {/* 6 main spokes - star pattern */}
      {[...Array(6)].map((_, i) => {
        const angle = (i * 60 * Math.PI) / 180;
        const innerR = 25;
        const outerR = 70;
        
        const spokeWidth = 0.3;
        
        const innerX = 160 + innerR * Math.cos(angle);
        const innerY = 160 + innerR * Math.sin(angle);
        
        const outerX = 160 + outerR * Math.cos(angle);
        const outerY = 160 + outerR * Math.sin(angle);
        
        const side1X = 160 + (innerR + 15) * Math.cos(angle - spokeWidth);
        const side1Y = 160 + (innerR + 15) * Math.sin(angle - spokeWidth);
        const side2X = 160 + (innerR + 15) * Math.cos(angle + spokeWidth);
        const side2Y = 160 + (innerR + 15) * Math.sin(angle + spokeWidth);
        
        const pathData = `M ${innerX} ${innerY} L ${side1X} ${side1Y} L ${outerX} ${outerY} L ${side2X} ${side2Y} Z`;
        
        return (
          <G key={i}>
            <Path
              d={pathData}
              fill="url(#spokeGrad)"
              stroke="#606060"
              strokeWidth="1"
            />
            <Line
              x1={innerX}
              y1={innerY}
              x2={outerX}
              y2={outerY}
              stroke="#E8E8E8"
              strokeWidth="2"
              opacity="0.5"
            />
          </G>
        );
      })}
      
      {/* Inner hub circle */}
      <Circle 
        cx="160" 
        cy="160" 
        r="35" 
        fill="url(#hubGrad)" 
        stroke="#606060" 
        strokeWidth="2" 
      />
      
      {/* Hub detail lines */}
      {[...Array(40)].map((_, i) => {
        const angle = (i * 9 * Math.PI) / 180;
        const r1 = 28;
        const r2 = 33;
        const x1 = 160 + r1 * Math.cos(angle);
        const y1 = 160 + r1 * Math.sin(angle);
        const x2 = 160 + r2 * Math.cos(angle);
        const y2 = 160 + r2 * Math.sin(angle);
        return (
          <Line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#505050"
            strokeWidth="1.5"
          />
        );
      })}
      
      {/* Center knob */}
      <Circle 
        cx="160" 
        cy="160" 
        r="20" 
        fill="url(#hubGrad)" 
        stroke="#505050" 
        strokeWidth="2" 
      />
      
      {/* Center knob detail ring */}
      <Circle 
        cx="160" 
        cy="160" 
        r="12" 
        fill="none" 
        stroke="#606060" 
        strokeWidth="1" 
      />
      
      {/* Highlight on center */}
      <Circle 
        cx="155" 
        cy="155" 
        r="6" 
        fill="#E8E8E8" 
        opacity="0.6" 
      />
      
      {/* Handle on right side */}
      <G>
        <Circle 
          cx="250" 
          cy="160" 
          r="15" 
          fill="url(#handleGrad)" 
          stroke="#606060" 
          strokeWidth="2" 
        />
        <Line
          x1="235"
          y1="160"
          x2="265"
          y2="160"
          stroke="url(#handleGrad)"
          strokeWidth="25"
          strokeLinecap="round"
        />
        <Circle 
          cx="235" 
          cy="160" 
          r="8" 
          fill="#A0A0A0" 
          stroke="#606060" 
          strokeWidth="1" 
        />
        <Circle 
          cx="265" 
          cy="160" 
          r="8" 
          fill="#A0A0A0" 
          stroke="#606060" 
          strokeWidth="1" 
        />
      </G>
    </AnimatedSvg>
  );
};

const SplashScreen = () => {
  const router = useRouter();
  const rotation = useRef(new Animated.Value(0)).current;
  const topHalf = useRef(new Animated.Value(0)).current;
  const bottomHalf = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() =>{ 
    checkAuth(); 
  }, []);

  // Idea is that since we already have the spinning animation, while that animation's playing 
  // we can route the user to either the home page if alrdy authenticated or the homepage 
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    setTimeout(() => {
      playAnimation(session);
    }, 500);
  };

  const playAnimation = (session: any) => {
    // Start spinning animation
    Animated.timing(rotation, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start(() => {
      // Then open the doors
      Animated.parallel([
        Animated.timing(topHalf, {
          toValue: -height / 2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bottomHalf, {
          toValue: height / 2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeOut, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // After animation, route based on session
        if (session) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      });
    });
  };


  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>
          <Text style={styles.titleBlack}>Brain</Text>
          <Text style={styles.titlePurple}>Bank</Text>
        </Text>
        <ActivityIndicator size="small" color={COLORS.darkPurple} style={{ marginTop: 20 }} />
      </View>

      {/* Top half overlay that slides up */}
      <Animated.View
        style={[
          styles.vaultHalf,
          styles.topHalf,
          { transform: [{ translateY: topHalf }], opacity: fadeOut },
        ]}
        pointerEvents="none"
      >
        <View style={styles.vaultClipTop}>
          <View style={{ position: 'absolute', top: 0, left: 0 }}>
            <VaultDoor rotation={rotation} />
          </View>
        </View>
      </Animated.View>

      {/* Bottom half overlay that slides down */}
      <Animated.View
        style={[
          styles.vaultHalf,
          styles.bottomHalf,
          { transform: [{ translateY: bottomHalf }], opacity: fadeOut },
        ]}
        pointerEvents="none"
      >
        <View style={styles.vaultClipBottom}>
          <View style={{ position: 'absolute', top: -160, left: 0 }}>
            <VaultDoor rotation={rotation} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  titlePurple: {
    color: COLORS.darkPurple,
  },
  titleBlack: {
    color: COLORS.black,
  },
  vaultHalf: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: COLORS.vaultGrey,
    alignItems: 'center',
    zIndex: 100,
  },
  topHalf: {
    top: 0,
    height: height / 2,
    justifyContent: 'flex-end',
  },
  bottomHalf: {
    bottom: 0,
    height: height / 2,
    justifyContent: 'flex-start',
  },
  vaultClipTop: {
    width: 320,
    height: 160,
    overflow: 'hidden',
  },
  vaultClipBottom: {
    width: 320,
    height: 160,
    overflow: 'hidden',
  },
});

export default SplashScreen;
