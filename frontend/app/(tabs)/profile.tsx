import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, Image, TextInput, ActivityIndicator } from 'react-native';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';

const COLORS = {
  darkPurple: '#6B4CE6',
  white: '#FFFFFF',
  black: '#1C1C1E',
  mediumGrey: '#636366',
  lightGrey: '#F2F2F7',
  red: '#FF3B30',
};

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface User {
  user_id: number;
  auth_id: string;
  neu_email: string;
  first_name: string;
  last_name: string;
  profile_picture: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      const token = session.access_token;
      
      const response = await fetch(`${API_URL}/api/v1/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setFirstName(userData.first_name || '');
        setLastName(userData.last_name || '');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

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

  const handleNavigationWithWarning = (route: string) => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before leaving?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => handleNavigation(route),
          },
          {
            text: 'Save',
            onPress: async () => {
              await handleSaveProfile();
              handleNavigation(route);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      handleNavigation(route);
    }
  };

  const handleLogout = async () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before logging out?',
        [
          {
            text: 'Discard & Logout',
            style: 'destructive',
            onPress: async () => {
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            },
          },
          {
            text: 'Save & Logout',
            onPress: async () => {
              await handleSaveProfile();
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
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
    }
  };

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const handleFirstNameChange = (text: string) => {
    setFirstName(text);
    if (user && text !== user.first_name) {
      setHasUnsavedChanges(true);
    } else if (user && text === user.first_name && lastName === user.last_name) {
      setHasUnsavedChanges(false);
    }
  };

  const handleLastNameChange = (text: string) => {
    setLastName(text);
    if (user && text !== user.last_name) {
      setHasUnsavedChanges(true);
    } else if (user && text === user.last_name && firstName === user.first_name) {
      setHasUnsavedChanges(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');
      
      const fileExt = uri.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${authUser.id}/${fileName}`;
      
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false
        });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);
      
      await updateProfilePictureUrl(publicUrl);
      
      Alert.alert('Success', 'Profile picture updated!');
      
    } catch (error) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      Alert.alert('Upload failed', message);
    } finally {
      setUploading(false);
    }
  };

  const updateProfilePictureUrl = async (url: string) => {
    try {
      const token = await getAuthToken();
      
      const response = await fetch(`${API_URL}/api/v1/me/profile-picture`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile_picture_url: url }),
      });
      
      if (response.ok) {
        // Refresh user data
        await fetchUser();
      } else {
        throw new Error('Failed to update profile picture');
      }
    } catch (error) {
      console.error('Error updating profile picture URL:', error);
      throw error;
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    try {
      setSaving(true);
      const token = await getAuthToken();

      const response = await fetch(`${API_URL}/api/v1/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        }),
      });

      if (response.ok) {
        await fetchUser();
        setHasUnsavedChanges(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout 
        userName="User" 
        onNavigate={handleNavigationWithWarning}
        activeRoute="profile"
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.darkPurple} />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      userName={user?.first_name || "User"} 
      onNavigate={handleNavigationWithWarning}
      activeRoute="profile"
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Profile Picture Section */}
          <View style={styles.profilePictureSection}>
            <TouchableOpacity 
              onPress={pickImage} 
              style={styles.profilePictureContainer}
              disabled={uploading}
            >
              {user?.profile_picture ? (
                <Image 
                  source={{ uri: user.profile_picture }} 
                  style={styles.profilePicture}
                />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <Text style={styles.profilePicturePlaceholderText}>
                    {user?.first_name?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.uploadHint}>Tap to change photo</Text>
          </View>

          {/* Name Fields Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={handleFirstNameChange}
                placeholder="Enter first name"
                placeholderTextColor={COLORS.mediumGrey}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={handleLastNameChange}
                placeholder="Enter last name"
                placeholderTextColor={COLORS.mediumGrey}
              />
            </View>

            {hasUnsavedChanges && (
              <Text style={styles.unsavedWarning}>
                You have unsaved changes
              </Text>
            )}

            <TouchableOpacity 
              style={[styles.saveButton, hasUnsavedChanges && styles.saveButtonHighlight]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Logout Section */}
          <View style={styles.section}>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureSection: {
    alignItems: 'center',
    marginVertical: 32,
  },
  profilePictureContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: COLORS.darkPurple,
  },
  profilePicture: {
    width: '100%',
    height: '100%',
  },
  profilePicturePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.darkPurple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicturePlaceholderText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadHint: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.mediumGrey,
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
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.black,
  },
  unsavedWarning: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: -8,
  },
  saveButton: {
    backgroundColor: COLORS.darkPurple,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonHighlight: {
    backgroundColor: '#5A3DD4',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
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