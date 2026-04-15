import React, { useState } from 'react';
import { supabase } from '@/services/supabase';
import {
  Image,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

const COLORS = {
  darkPurple: '#6B4CE6',
  white: '#FFFFFF',
  black: '#1C1C1E',
  mediumGrey: '#636366',
  lightGrey: '#F2F2F7',
};

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setAuthError('Please enter both email and password');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    setLoading(false);

    if (error) {
      setAuthError(error.message);
    } else {
      setAuthError(null);
      router.replace('/(tabs)');
    }
  };

  const handleSignUp = () => {
    router.push('/(auth)/signup');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/piggybank.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>
            <Text style={styles.titleBlack}>Brain</Text>
            <Text style={styles.titlePurple}>Bank</Text>
          </Text>
          <Text style={styles.subtitle}>Deposit Notes, Withdraw A&apos;s</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="NEU Email"
            placeholderTextColor={COLORS.mediumGrey}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(t) => { setEmail(t); setAuthError(null); }}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.mediumGrey}
            secureTextEntry
            value={password}
            onChangeText={(t) => { setPassword(t); setAuthError(null); }}
            editable={!loading}
          />

          {authError && <Text style={styles.authError}>{authError}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Logging in...' : 'Log In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.signupPrompt}>
            <Text style={styles.signupPromptText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoImage: { width: 100, height: 100, marginBottom: 8 },
  title: { fontSize: 42, fontWeight: '800', marginBottom: 12, letterSpacing: -1 },
  titlePurple: { color: COLORS.darkPurple },
  titleBlack: { color: COLORS.black },
  subtitle: { fontSize: 15, color: COLORS.mediumGrey, fontStyle: 'italic', letterSpacing: 0.5 },
  formContainer: { width: '100%', maxWidth: 340 },
  input: { backgroundColor: COLORS.lightGrey, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: COLORS.black, marginBottom: 16 },
  authError: { color: '#CC0000', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  primaryButton: { backgroundColor: COLORS.darkPurple, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  forgotPassword: { alignItems: 'center', marginBottom: 24 },
  forgotPasswordText: { color: COLORS.darkPurple, fontSize: 14 },
  signupPrompt: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupPromptText: { fontSize: 14, color: COLORS.mediumGrey },
  signupLink: { fontSize: 14, color: COLORS.darkPurple, fontWeight: '600' },
});

export default LoginScreen;