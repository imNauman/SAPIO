import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ViewProfileScreen } from '../screens/ViewProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { CreateProfileScreen } from '../screens/CreateProfileScreen';
import { PhotoGalleryScreen } from '../screens/PhotoGalleryScreen';
import { UploadPhotoScreen } from '../screens/UploadPhotoScreen';
import { ReorderPhotosScreen } from '../screens/ReorderPhotosScreen';
import { DiscoveryScreen } from '../screens/DiscoveryScreen';
import { RecommendationSettingsScreen } from '../screens/RecommendationSettingsScreen';
import { DiscoveryPreferencesScreen } from '../screens/DiscoveryPreferencesScreen';
import { LocationPermissionScreen } from '../screens/LocationPermissionScreen';
import { LocationUnavailableScreen } from '../screens/LocationUnavailableScreen';
import { MatchesScreen } from '../screens/MatchesScreen';
import { ChatListScreen } from '../screens/ChatListScreen';
import { ConversationScreen } from '../screens/ConversationScreen';
import { BlockedUsersScreen } from '../screens/BlockedUsersScreen';
import { MyReportsScreen } from '../screens/MyReportsScreen';
import { VerificationScreen } from '../screens/VerificationScreen';
import { NotificationCenterScreen } from '../screens/NotificationCenterScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AccountSettingsScreen } from '../screens/AccountSettingsScreen';
import { PrivacySettingsScreen } from '../screens/PrivacySettingsScreen';
import { SecuritySettingsScreen } from '../screens/SecuritySettingsScreen';
import { HelpSupportScreen } from '../screens/HelpSupportScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { DeleteAccountScreen } from '../screens/DeleteAccountScreen';
import { PremiumScreen } from '../screens/PremiumScreen';
import { BoostScreen } from '../screens/BoostScreen';
import { SuperLikeHistoryScreen } from '../screens/SuperLikeHistoryScreen';
import { useProfileStore } from '../store/profileStore';

/**
 * Root navigator.
 *
 * Why: Switches between an unauthenticated `Auth` stack (Splash → Login →
 * Signup → ForgotPassword) and an authenticated `App` stack (Home) based on the
 * auth store. `SplashScreen` bootstraps the persisted session; while loading we
 * show `LoadingScreen`. This is the route-protection mechanism — unauthenticated
 * users can never reach `Home`.
 */
export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  PhotoGallery: undefined;
  UploadPhoto: undefined;
  ReorderPhotos: undefined;
  ViewProfile: { userId?: string };
  EditProfile: undefined;
  CreateProfile: undefined;
  Discovery: undefined;
  RecommendationSettings: undefined;
  DiscoveryPreferences: undefined;
  LocationPermission: undefined;
  LocationUnavailable: undefined;
  Matches: undefined;
  ChatList: undefined;
  Conversation: { conversationId?: string; matchId?: string };
  BlockedUsers: undefined;
  MyReports: undefined;
  Verification: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Settings: undefined;
  AccountSettings: undefined;
  PrivacySettings: undefined;
  SecuritySettings: undefined;
  HelpSupport: undefined;
  About: { article?: string };
  DeleteAccount: undefined;
  Premium: undefined;
  Boost: undefined;
  SuperLikeHistory: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator initialRouteName="Splash">
      <AuthStack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  const profile = useProfileStore((s) => s.profile);
  const profileLoading = useProfileStore((s) => s.loading);

  // While the profile is still loading we can't decide the entry screen yet.
  if (profileLoading && !profile) {
    return <LoadingScreen />;
  }

  // Gate by profile completion: new users go to Create, everyone else to View.
  const initial = profile ? 'ViewProfile' : 'CreateProfile';

  return (
    <AppStack.Navigator initialRouteName={initial}>
      <AppStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'SAPIO' }}
      />
      <AppStack.Screen
        name="ViewProfile"
        component={ViewProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <AppStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <AppStack.Screen
        name="CreateProfile"
        component={CreateProfileScreen}
        options={{ title: 'Create Profile' }}
      />
      <AppStack.Screen
        name="PhotoGallery"
        component={PhotoGalleryScreen}
        options={{ title: 'My Photos' }}
      />
      <AppStack.Screen
        name="UploadPhoto"
        component={UploadPhotoScreen}
        options={{ title: 'Add Photo' }}
      />
      <AppStack.Screen
        name="ReorderPhotos"
        component={ReorderPhotosScreen}
        options={{ title: 'Reorder Photos' }}
      />
      <AppStack.Screen
        name="Discovery"
        component={DiscoveryScreen}
        options={{ title: 'Discover' }}
      />
      <AppStack.Screen
        name="RecommendationSettings"
        component={RecommendationSettingsScreen}
        options={{ title: 'Discovery Settings' }}
      />
      <AppStack.Screen
        name="DiscoveryPreferences"
        component={DiscoveryPreferencesScreen}
        options={{ title: 'Discovery Preferences' }}
      />
      <AppStack.Screen
        name="LocationPermission"
        component={LocationPermissionScreen}
        options={{ title: 'Location' }}
      />
      <AppStack.Screen
        name="LocationUnavailable"
        component={LocationUnavailableScreen}
        options={{ title: 'Location Unavailable' }}
      />
      <AppStack.Screen
        name="Matches"
        component={MatchesScreen}
        options={{ title: 'Matches' }}
      />
      <AppStack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: 'Messages' }}
      />
      <AppStack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{ title: 'Chat' }}
      />
      <AppStack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{ title: 'Blocked Users' }}
      />
      <AppStack.Screen
        name="MyReports"
        component={MyReportsScreen}
        options={{ title: 'My Reports' }}
      />
      <AppStack.Screen
        name="Verification"
        component={VerificationScreen}
        options={{ title: 'Verification' }}
      />
      <AppStack.Screen
        name="Notifications"
        component={NotificationCenterScreen}
        options={{ title: 'Notifications' }}
      />
      <AppStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Notification Settings' }}
      />
      <AppStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <AppStack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={{ title: 'Account' }}
      />
      <AppStack.Screen
        name="PrivacySettings"
        component={PrivacySettingsScreen}
        options={{ title: 'Privacy' }}
      />
      <AppStack.Screen
        name="SecuritySettings"
        component={SecuritySettingsScreen}
        options={{ title: 'Security' }}
      />
      <AppStack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ title: 'Help & Support' }}
      />
      <AppStack.Screen
        name="About"
        component={AboutScreen}
        options={{ title: 'About SAPIO' }}
      />
      <AppStack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{ title: 'Delete Account' }}
      />
      <AppStack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{ title: 'Premium' }}
      />
      <AppStack.Screen
        name="Boost"
        component={BoostScreen}
        options={{ title: 'Boost' }}
      />
      <AppStack.Screen
        name="SuperLikeHistory"
        component={SuperLikeHistoryScreen}
        options={{ title: 'Super Likes' }}
      />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const loading = useAuthStore((s) => s.loading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (loading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
}
