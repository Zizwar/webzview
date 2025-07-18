import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Switch, Modal, Alert } from 'react-native';
import { Icon } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const BottomSheet = ({ 
  visible, 
  onClose, 
  isDarkMode,
  toggleDarkMode,
  toggleDesktopMode,
  isDesktopMode,
  shareUrl,
  clearData,
  openHistory,
  openAboutModal,
  currentUrl,
  isSafeMode,
  toggleSafeMode,
  openUserAgentSelector,
  webViewRef,
  currentUserAgent,
  onSelectUserAgent
}) => {
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showUserAgentModal, setShowUserAgentModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  
  const backgroundColor = isDarkMode ? '#1E1E1E' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';

  const clearBrowserData = async () => {
    // مسح الكوكيز من WebView
    if (webViewRef && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        // مسح جميع الكوكيز
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        // مسح localStorage
        localStorage.clear();
        
        // مسح sessionStorage
        sessionStorage.clear();
        
        true;
      `);
    }
    
    // مسح التاريخ والفيفوريت
    try {
      await AsyncStorage.removeItem('browserHistory');
      await AsyncStorage.removeItem('favorites');
    } catch (error) {
      console.error('Error clearing browser data:', error);
    }
    
    setShowClearDataModal(false);
    Alert.alert('Success', 'Browser data cleared successfully');
  };

  const clearFavorites = () => {
    // Clear favorites logic here
    setShowClearDataModal(false);
    // Implementation for clearing favorites
  };

  const clearScripts = () => {
    // Clear scripts logic here
    setShowClearDataModal(false);
    // Implementation for clearing scripts
  };

  const clearAppStorage = () => {
    // Clear app storage logic here
    setShowClearDataModal(false);
    // Implementation for clearing app storage
  };

  const clearAllData = async () => {
    Alert.alert(
      "Clear All Data",
      "This will delete:\n• All browsing history\n• All favorites\n• All saved scripts\n• All app settings\n\nThis action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert("Data Cleared", "All app data has been cleared successfully.");
              setShowClearDataModal(false);
            } catch (error) {
              Alert.alert("Error", "Failed to clear data. Please try again.");
            }
          }
        }
      ]
    );
  };

  const exportData = async (dataType) => {
    try {
      let dataToExport = {};
      
      switch(dataType) {
        case 'favorites':
          const favorites = await AsyncStorage.getItem('favorites');
          dataToExport = { favorites: favorites ? JSON.parse(favorites) : [] };
          break;
        case 'history':
          const history = await AsyncStorage.getItem('browserHistory');
          dataToExport = { history: history ? JSON.parse(history) : [] };
          break;
        case 'scripts':
          const scripts = await AsyncStorage.getItem('userScripts');
          dataToExport = { scripts: scripts ? JSON.parse(scripts) : [] };
          break;
        case 'all':
          const allKeys = await AsyncStorage.getAllKeys();
          const allData = await AsyncStorage.multiGet(allKeys);
          dataToExport = allData.reduce((acc, [key, value]) => {
            acc[key] = value ? JSON.parse(value) : null;
            return acc;
          }, {});
          break;
      }
      
      const fileName = `niabrowser_${dataType}_${new Date().getTime()}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(dataToExport, null, 2));
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert('Export Failed', error.message);
    }
  };

  const importData = async (mergeOption) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });
      
      if (!result.canceled) {
        const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
        const importedData = JSON.parse(fileContent);
        
        if (mergeOption === 'replace') {
          // Clear existing data first
          await AsyncStorage.clear();
        }
        
        // Import data
        for (const [key, value] of Object.entries(importedData)) {
          if (mergeOption === 'merge' && key === 'favorites') {
            const existing = await AsyncStorage.getItem(key);
            const existingData = existing ? JSON.parse(existing) : [];
            const merged = [...new Set([...existingData, ...value])];
            await AsyncStorage.setItem(key, JSON.stringify(merged));
          } else {
            await AsyncStorage.setItem(key, JSON.stringify(value));
          }
        }
        
        Alert.alert('Import Successful', 'Data has been imported successfully');
        setShowDataModal(false);
      }
    } catch (error) {
      Alert.alert('Import Failed', error.message);
    }
  };

  const handleUserAgentSelect = (userAgent) => {
    if (onSelectUserAgent) {
      onSelectUserAgent(userAgent);
    }
    setShowUserAgentModal(false);
  };

  const settingsData = [
    { icon: 'brightness-6', title: 'Dark Mode', onPress: toggleDarkMode, value: isDarkMode },
    { icon: 'desktop-windows', title: 'Desktop Mode', onPress: toggleDesktopMode, value: isDesktopMode },
    { icon: 'security', title: 'Safe Mode', onPress: toggleSafeMode, value: isSafeMode },
    { icon: 'person', title: 'User Agent', onPress: () => setShowUserAgentModal(true) },
    { icon: 'history', title: 'History', onPress: openHistory },
    { icon: 'share', title: 'Share', onPress: () => shareUrl(currentUrl) },
    { icon: 'folder', title: 'Data Management', onPress: () => setShowDataModal(true) },
    { icon: 'info', title: 'About', onPress: openAboutModal },
  ];

  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity style={styles.settingItem} onPress={item.onPress}>
      <Icon name={item.icon} type="material" color="#007AFF" size={24} />
      <Text style={[styles.settingText, { color: textColor }]}>{item.title}</Text>
      {item.value !== undefined && (
        <Switch
          value={item.value}
          onValueChange={item.onPress}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={item.value ? "#f5dd4b" : "#f4f3f4"}
        />
      )}
    </TouchableOpacity>
  ), [textColor]);

  return (
    <View style={[styles.container, { backgroundColor, display: visible ? 'flex' : 'none' }]}>
      <FlatList
        data={settingsData}
        renderItem={renderItem}
        keyExtractor={(item) => item.title}
      />
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Icon name="close" type="material" color={textColor} size={24} />
      </TouchableOpacity>

      {showClearDataModal && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.clearDataModalOverlay}>
            <View style={[styles.clearDataModal, { backgroundColor }]}>
              <Text style={[styles.clearDataTitle, { color: textColor }]}>Clear Data Options</Text>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => clearBrowserData()}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>🌐 Clear Browser Data (Cookies, History)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => clearFavorites()}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>⭐ Clear Favorites</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => clearScripts()}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>📜 Clear Scripts</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => clearAppStorage()}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>📱 Clear App Storage</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => clearAllData()}>
                <Text style={[styles.clearOptionText, { color: '#FF4444' }]}>🗑️ Clear All Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowClearDataModal(false)}>
                <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* User Agent Selection Modal */}
      {showUserAgentModal && (
        <Modal transparent visible={true} animationType="slide">
          <View style={styles.clearDataModalOverlay}>
            <View style={[styles.clearDataModal, { backgroundColor }]}>
              <Text style={[styles.clearDataTitle, { color: textColor }]}>Select User Agent</Text>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => handleUserAgentSelect(null)}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>🔄 Default (Auto)</Text>
                {!currentUserAgent && <Text style={{ color: '#4CAF50', marginLeft: 10 }}>✓</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => handleUserAgentSelect('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>💻 Chrome Desktop</Text>
                {currentUserAgent === 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' && <Text style={{ color: '#4CAF50', marginLeft: 10 }}>✓</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => handleUserAgentSelect('Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36')}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>📱 Chrome Mobile</Text>
                {currentUserAgent === 'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' && <Text style={{ color: '#4CAF50', marginLeft: 10 }}>✓</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => handleUserAgentSelect('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.0 Safari/537.36')}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>🍎 Safari Desktop</Text>
                {currentUserAgent === 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.0 Safari/537.36' && <Text style={{ color: '#4CAF50', marginLeft: 10 }}>✓</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => handleUserAgentSelect('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/537.36')}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>📱 Safari iOS</Text>
                {currentUserAgent === 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/537.36' && <Text style={{ color: '#4CAF50', marginLeft: 10 }}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.clearOption} onPress={() => handleUserAgentSelect('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0')}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>🌐 Edge Desktop</Text>
                {currentUserAgent === 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' && <Text style={{ color: '#4CAF50', marginLeft: 10 }}>✓</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowUserAgentModal(false)}>
                <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Data Management Modal */}
      {showDataModal && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.clearDataModalOverlay}>
            <View style={[styles.clearDataModal, { backgroundColor }]}>
              <Text style={[styles.clearDataTitle, { color: textColor }]}>Data Management</Text>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => exportData('all')}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>📤 Export All Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => exportData('favorites')}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>⭐ Export Favorites</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => exportData('history')}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>📚 Export History</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => exportData('scripts')}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>📜 Export Scripts</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => importData('merge')}>
                <Text style={[styles.clearOptionText, { color: textColor }]}>📥 Import & Merge Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => importData('replace')}>
                <Text style={[styles.clearOptionText, { color: '#FF8800' }]}>🔄 Import & Replace Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.clearOption} onPress={() => { setShowDataModal(false); setShowClearDataModal(true); }}>
                <Text style={[styles.clearOptionText, { color: '#FF4444' }]}>🗑️ Clear Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowDataModal(false)}>
                <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};



const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },
  settingText: {
    marginLeft: 15,
    fontSize: 16,
    flex: 1,
  },
  settingValue: {
    fontSize: 14,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  clearDataModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearDataModal: {
    width: '80%',
    borderRadius: 15,
    padding: 20,
  },
  clearDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  clearOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  clearOptionText: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 15,
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BottomSheet;