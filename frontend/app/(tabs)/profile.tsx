import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';

// ─── Colors ──────────────────────────────────────────────────
const COLORS = {
  purple: '#6B5BC7',
  darkPurple: '#5A4AB5',
  lightPurple: '#E8E5F5',
  white: '#FFFFFF',
  black: '#1C1C1E',
  darkGrey: '#3C3C43',
  mediumGrey: '#636366',
  lightGrey: '#F2F2F7',
  borderGrey: '#E5E5EA',
  red: '#FF3B30',
  green: '#34C759',
};

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ─── Icons ───────────────────────────────────────────────────
const EditIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
      stroke={COLORS.purple}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
      stroke={COLORS.purple}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CheckIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17l-5-5"
      stroke={COLORS.white}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CloseIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={COLORS.mediumGrey}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronRight = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={COLORS.mediumGrey}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LockIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"
      stroke={COLORS.darkGrey}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"
      stroke={COLORS.red}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LogoutIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
      stroke={COLORS.red}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Types ───────────────────────────────────────────────────
interface User {
  user_id: number;
  auth_id: string;
  neu_email: string;
  first_name: string;
  last_name: string;
  profile_picture: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────
function formatJoinDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getInitials(firstName: string, lastName: string, email: string): string {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  if (firstName) return firstName.charAt(0).toUpperCase();
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function getDisplayName(firstName: string, lastName: string, email: string): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

// ─── Main Component ──────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();

  // User state (from backend API)
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Edit name state
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [saving, setSaving] = useState(false);

  // Profile picture state
  const [uploading, setUploading] = useState(false);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // ─── Load user ───────────────────────────────────────────
  useEffect(() => {
    fetchUser();
  }, []);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      // Get auth user info (for email + created_at)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setEmail(authUser.email ?? '');
        setCreatedAt(authUser.created_at);
      }

      // Get backend user info (for name + profile picture)
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

  // ─── Navigation ──────────────────────────────────────────
  const handleNavigation = (route: string) => {
    if (route === 'home') router.push('/(tabs)');
    else if (route === 'notes') router.push('/(tabs)/notes');
    else if (route === 'chat') router.push('/(tabs)/chat');
    else if (route === 'profile') router.push('/(tabs)/profile');
  };

  // ─── Profile Picture ─────────────────────────────────────
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
          upsert: false,
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
        await fetchUser();
      } else {
        throw new Error('Failed to update profile picture');
      }
    } catch (error) {
      console.error('Error updating profile picture URL:', error);
      throw error;
    }
  };

  // ─── Edit Name (saves via backend API) ───────────────────
  const startEditing = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditFirstName('');
    setEditLastName('');
  };

  const saveName = async () => {
    const trimFirst = editFirstName.trim();
    const trimLast = editLastName.trim();

    if (!trimFirst || !trimLast) {
      Alert.alert('Error', 'Please enter both first and last name.');
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
          first_name: trimFirst,
          last_name: trimLast,
        }),
      });

      if (response.ok) {
        await fetchUser();
        setIsEditing(false);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (err: any) {
      console.error('Failed to save name:', err);
      Alert.alert('Error', err.message || 'Failed to save name.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Change Password ─────────────────────────────────────
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert('Success', 'Your password has been updated.');
      setShowPasswordChange(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Failed to change password:', err);
      Alert.alert('Error', err.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  // ─── Logout ──────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  // ─── Delete Account ──────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data, notes, and courses will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  // ─── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout userName="User" onNavigate={handleNavigation} activeRoute="profile">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </AppLayout>
    );
  }

  const displayName = getDisplayName(firstName, lastName, email);
  const initials = getInitials(firstName, lastName, email);
  const hasName = firstName && lastName;

  // ─── Render ──────────────────────────────────────────────
  return (
    <AppLayout userName={displayName} onNavigate={handleNavigation} activeRoute="profile">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* ── Profile Picture + Name Header ──────────────── */}
          <View style={styles.profileHeader}>
            {/* Profile Picture */}
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
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.uploadHint}>Tap to change photo</Text>

            {isEditing ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder="First Name"
                  placeholderTextColor={COLORS.mediumGrey}
                  autoFocus
                />
                <TextInput
                  style={styles.nameInput}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder="Last Name"
                  placeholderTextColor={COLORS.mediumGrey}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveName}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <CheckIcon />
                        <Text style={styles.saveButtonText}>Save</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing}>
                    <CloseIcon />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.nameContainer}>
                <Text style={styles.fullName}>{displayName}</Text>
                <Text style={styles.email}>{email}</Text>
                <Text style={styles.joinDate}>Joined {formatJoinDate(createdAt)}</Text>
                <TouchableOpacity style={styles.editProfileButton} onPress={startEditing}>
                  <EditIcon />
                  <Text style={styles.editProfileText}>
                    {hasName ? 'Edit Name' : 'Add Your Name'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Account Info Section ───────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{email}</Text>
              </View>
              {hasName && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>First Name</Text>
                    <Text style={styles.infoValue}>{firstName}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Last Name</Text>
                    <Text style={styles.infoValue}>{lastName}</Text>
                  </View>
                </>
              )}
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>{formatJoinDate(createdAt)}</Text>
              </View>
            </View>
          </View>

          {/* ── Security Section ───────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => setShowPasswordChange(!showPasswordChange)}
              >
                <View style={styles.menuRowLeft}>
                  <LockIcon />
                  <Text style={styles.menuRowText}>Change Password</Text>
                </View>
                <ChevronRight />
              </TouchableOpacity>

              {showPasswordChange && (
                <View style={styles.passwordSection}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="New Password"
                    placeholderTextColor={COLORS.mediumGrey}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm New Password"
                    placeholderTextColor={COLORS.mediumGrey}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity
                    style={[styles.changePasswordButton, changingPassword && styles.buttonDisabled]}
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                  >
                    <Text style={styles.changePasswordText}>
                      {changingPassword ? 'Updating...' : 'Update Password'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* ── Account Actions ─────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Actions</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.menuRow} onPress={handleLogout}>
                <View style={styles.menuRowLeft}>
                  <LogoutIcon />
                  <Text style={[styles.menuRowText, { color: COLORS.red }]}>Logout</Text>
                </View>
                <ChevronRight />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuRow} onPress={handleDeleteAccount}>
                <View style={styles.menuRowLeft}>
                  <TrashIcon />
                  <Text style={[styles.menuRowText, { color: COLORS.red }]}>Delete Account</Text>
                </View>
                <ChevronRight />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.mediumGrey,
  },

  // ── Profile Header ─────────────────────────────────────
  profileHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 28,
  },
  profilePictureContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: COLORS.purple,
    marginBottom: 8,
  },
  profilePicture: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.lightPurple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.purple,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadHint: {
    fontSize: 13,
    color: COLORS.mediumGrey,
    marginBottom: 16,
  },
  nameContainer: {
    alignItems: 'center',
  },
  fullName: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    color: COLORS.mediumGrey,
    marginBottom: 2,
  },
  joinDate: {
    fontSize: 13,
    color: COLORS.mediumGrey,
    marginBottom: 16,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightPurple,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },
  editProfileText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.purple,
  },

  // ── Edit Name ──────────────────────────────────────────
  editNameContainer: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  nameInput: {
    width: '100%',
    backgroundColor: COLORS.lightGrey,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGrey,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 6,
  },
  cancelButtonText: {
    color: COLORS.mediumGrey,
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Sections ───────────────────────────────────────────
  section: {
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.mediumGrey,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderGrey,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.mediumGrey,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.black,
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderGrey,
    marginHorizontal: 16,
  },

  // ── Menu Rows ──────────────────────────────────────────
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuRowText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.darkGrey,
  },

  // ── Password Change ────────────────────────────────────
  passwordSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGrey,
    paddingTop: 16,
  },
  passwordInput: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 12,
  },
  changePasswordButton: {
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  changePasswordText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});