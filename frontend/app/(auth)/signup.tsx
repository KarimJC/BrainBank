import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';

const COLORS = {
  darkPurple: '#6B4CE6',
  white: '#FFFFFF',
  black: '#1C1C1E',
  mediumGrey: '#636366',
  lightGrey: '#F2F2F7',
};

const SignUpScreen: React.FC = () => {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setAuthError('Please fill in all fields');
      return;
    }
    if (!email.toLowerCase().trim().endsWith('@northeastern.edu')) {
      setAuthError('Please use your @northeastern.edu email address');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }
      }
    });

    setLoading(false);

    if (error) {
      setAuthError(error.message);
    } else {
      Alert.alert(
        'Success!',
        'Account created! You can now log in.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            <Text style={styles.subtitle}>NEU Students Only</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor={COLORS.mediumGrey}
              autoCapitalize="words"
              value={firstName}
              onChangeText={(t) => { setFirstName(t); clearError(); }}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor={COLORS.mediumGrey}
              autoCapitalize="words"
              value={lastName}
              onChangeText={(t) => { setLastName(t); clearError(); }}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="NEU Email (@northeastern.edu)"
              placeholderTextColor={COLORS.mediumGrey}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => { setEmail(t); clearError(); }}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={COLORS.mediumGrey}
              secureTextEntry
              value={password}
              onChangeText={(t) => { setPassword(t); clearError(); }}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={COLORS.mediumGrey}
              secureTextEntry
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); clearError(); }}
              editable={!loading}
            />

            {authError && <Text style={styles.authError}>{authError}</Text>}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoImage: { width: 100, height: 100, marginBottom: 8 },
  title: { fontSize: 42, fontWeight: '800', marginBottom: 12, letterSpacing: -1 },
  titlePurple: { color: COLORS.darkPurple },
  titleBlack: { color: COLORS.black },
  subtitle: { fontSize: 15, color: COLORS.mediumGrey, fontStyle: 'italic', letterSpacing: 0.5 },
  formContainer: { width: '100%', maxWidth: 340 },
  input: { backgroundColor: COLORS.lightGrey, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: COLORS.black, marginBottom: 16 },
  authError: { color: '#CC0000', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  primaryButton: { backgroundColor: COLORS.darkPurple, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 24 },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  loginPrompt: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginPromptText: { fontSize: 14, color: COLORS.mediumGrey },
  loginLink: { fontSize: 14, color: COLORS.darkPurple, fontWeight: '600' },
});

export default SignUpScreen;