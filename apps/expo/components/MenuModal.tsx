import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
  isConnected: boolean;
  isConversationMode: boolean;
  isAudioStreaming: boolean;
  messageCount: number;
  onToggleConversationMode: () => void;
  onOpenChat: () => void;
}

export default function MenuModal({
  visible,
  onClose,
  isConnected,
  isConversationMode,
  isAudioStreaming,
  messageCount,
  onToggleConversationMode,
  onOpenChat,
}: MenuModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.menuContainer} 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Menu</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.menuContent}>
            {/* Connection Status */}
            <View style={styles.statusSection}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={styles.statusItem}>
                <View style={[
                  styles.statusIndicator, 
                  { backgroundColor: isConnected ? '#00AA00' : '#FF4444' }
                ]} />
                <Text style={styles.statusText}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Text>
              </View>
              
              {isAudioStreaming && (
                <View style={styles.statusItem}>
                  <View style={[styles.statusIndicator, { backgroundColor: '#FF8800' }]} />
                  <Text style={styles.statusText}>Streaming Audio</Text>
                </View>
              )}
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              {/* Chat Option */}
              <TouchableOpacity style={styles.menuItem} onPress={onOpenChat}>
                <View style={styles.menuItemLeft}>
                  <Ionicons name="chatbubble-outline" size={24} color="#fff" />
                  <Text style={styles.menuItemText}>Chat</Text>
                </View>
                {messageCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{messageCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Continuous Mode Toggle */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={onToggleConversationMode}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons 
                    name={isConversationMode ? "infinite" : "infinite-outline"} 
                    size={24} 
                    color={isConversationMode ? "#00AA00" : "#fff"} 
                  />
                  <Text style={[
                    styles.menuItemText,
                    isConversationMode && { color: '#00AA00' }
                  ]}>
                    Continuous Mode
                  </Text>
                </View>
                <View style={[
                  styles.toggle,
                  { backgroundColor: isConversationMode ? '#00AA00' : '#333' }
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    { 
                      marginLeft: isConversationMode ? 14 : 2,
                      backgroundColor: isConversationMode ? '#fff' : '#666'
                    }
                  ]} />
                </View>
              </TouchableOpacity>

              {/* Settings (Future) */}
              <TouchableOpacity style={[styles.menuItem, styles.disabledItem]}>
                <View style={styles.menuItemLeft}>
                  <Ionicons name="settings-outline" size={24} color="#666" />
                  <Text style={[styles.menuItemText, { color: '#666' }]}>Settings</Text>
                </View>
                <Text style={styles.comingSoon}>Coming Soon</Text>
              </TouchableOpacity>

              {/* Help (Future) */}
              <TouchableOpacity style={[styles.menuItem, styles.disabledItem]}>
                <View style={styles.menuItemLeft}>
                  <Ionicons name="help-circle-outline" size={24} color="#666" />
                  <Text style={[styles.menuItemText, { color: '#666' }]}>Help</Text>
                </View>
                <Text style={styles.comingSoon}>Coming Soon</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>June Voice Assistant v1.0</Text>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  menuContainer: {
    width: 300,
    maxHeight: '80%',
    backgroundColor: '#1a1a1a',
    marginLeft: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuContent: {
    flex: 1,
  },
  statusSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#ccc',
  },
  menuItems: {
    flex: 1,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  disabledItem: {
    opacity: 0.6,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  badge: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  toggle: {
    width: 32,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  comingSoon: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
});
