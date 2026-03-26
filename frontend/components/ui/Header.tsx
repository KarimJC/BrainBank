import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';

interface HeaderProps {
  userName: string;
  profileImage?: string | null;
  onProfilePress?: () => void;
  hideProfile?: boolean;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
};

const Header: React.FC<HeaderProps> = ({
  userName,
  profileImage,
  onProfilePress,
  hideProfile = false,
}) => {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>
        Brain<Text style={styles.logoAccent}>Bank</Text>
      </Text>
      {!hideProfile && (
        <TouchableOpacity
          style={styles.profileButton}
          onPress={onProfilePress}
        >
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.defaultProfile}>
              <Text style={styles.defaultProfileText}>
                {getInitials(userName)}
              </Text>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  logoAccent: {
    color: '#6B5BC7',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5BC7',
  },
});

export default Header;
