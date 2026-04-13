import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useUser } from '@/contexts/UserContext';

interface HeaderProps {
  onNavigate: (route: string) => void;
  activeRoute?: string;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, activeRoute = 'home' }) => {
  const { user, initials, loading } = useUser();
  const [imageError, setImageError] = useState(false);

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
          {!loading && user?.profile_picture && !imageError ? (
            <Image
              source={{ uri: user.profile_picture }}
              style={styles.profileImage}
              onError={() => setImageError(true)}
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
