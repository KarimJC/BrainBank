import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { supabase } from '@/services/supabase';
import { API_BASE_URL } from '@/services/api';

interface UserProfile {
  user_id: number;
  auth_id: string;
  neu_email: string;
  first_name: string;
  last_name: string;
  profile_picture?: string | null;
}

interface HeaderProps {
  onNavigate: (route: string) => void;
  activeRoute?: string;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, activeRoute = 'home' }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [initials, setInitials] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          console.error('No active session:', sessionError?.message);
          return;
        }

        const email = session.user.email ?? '';
        const localPart = email.split('@')[0];
        const parts = localPart.split('.');
        if (parts.length >= 2) {
          setInitials(parts[1][0]?.toUpperCase() ?? '');
        } else {
          setInitials(parts[0][0]?.toUpperCase() ?? '');
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          }
        });
        if (!response.ok) {
          console.error('Failed to fetch user, status:', response.status);
          return;
        }
        const data: UserProfile = await response.json();

        setUser(data);
        if (data.first_name) {
          setInitials(data.first_name.charAt(0).toUpperCase());
        }
      } catch (err) {
        console.error('Header fetch error:', (err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>
          Brain<Text style={styles.logoAccent}>Bank</Text>
        </Text>
        <Image
          source={require('@/assets/images/piggybank.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      {activeRoute !== 'profile' && (
        <TouchableOpacity style={styles.profileButton} onPress={() => onNavigate('profile')}>
          {!loading && user?.profile_picture ? (
            <Image
              source={{ uri: user.profile_picture }}
              style={styles.profileImage}
              onError={() => setUser((prev) => prev ? { ...prev, profile_picture: null } : null)}
            />
          ) : (
            <View style={styles.defaultProfile}>
              {initials ? (
                <Text style={styles.defaultProfileText}>{initials}</Text>
              ) : null}
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoImage: {
    width: 55,
    height: 55,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 5,
  },
  logoAccent: {
    color: '#6B5BC7',
  },
  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  defaultProfile: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8E5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B5BC7',
  },
});

export default Header;
