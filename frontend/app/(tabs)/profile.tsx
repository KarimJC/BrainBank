import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';

const COLORS = {
  darkPurple: '#6B4CE6',
  white: '#FFFFFF',
  black: '#1C1C1E',
  mediumGrey: '#636366',
  lightGrey: '#F2F2F7',
  red: '#FF3B30',
};

export default function ProfileScreen() {
  const router = useRouter();

  const handleNavigation = (route: string) => {
    if (route === 'home') {
      router.push('/(tabs)');
    } else if (route === 'notes') {
      router.push('/(tabs)/notes');
    } else if (route === 'chat') {
      router.push('/(tabs)/chat');
    } else if (route === 'profile') {
      router.push('/(tabs)/profile');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <AppLayout 
      userName="User" 
      onNavigate={handleNavigation}
      activeRoute="profile"
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: COLORS.red,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});