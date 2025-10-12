import { Platform, PermissionsAndroid, Alert } from 'react-native';

export const requestMicrophonePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: "Microphone Permission",
          message: "This app needs access to your microphone for voice communication",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  } else {
    // iOS permissions are handled automatically by the system
    // But we can still check if we have permission
    return true;
  }
};

export const checkMicrophonePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    return hasPermission;
  }
  return true;
};

export const showPermissionDeniedAlert = () => {
  Alert.alert(
    'Permission Required',
    'Microphone access is required for voice calls. Please grant permission in your device settings.',
    [
      {
        text: 'Cancel',
        style: 'cancel'
      },
      {
        text: 'Open Settings',
        onPress: () => {
          // You can add deep link to settings here if needed
          console.log('Redirect to app settings');
        }
      }
    ]
  );
};