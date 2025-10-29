import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  videoId: string;
  videoTitle: string;
  onClose: () => void;
}

export default function YouTubeModal({ visible, videoId, videoTitle, onClose }: Props) {
  // YouTube embed URL
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <View style={styles.headerContent}>
              <Text style={styles.title} numberOfLines={2}>
                {videoTitle}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Video Player */}
          <View style={styles.videoContainer}>
            <WebView
              source={{ uri: embedUrl }}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#8E8E93" />
            <Text style={styles.infoText}>
              This video is for reference only. Follow your prescribed protocol.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#3A3A3C',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
    lineHeight: 24,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 18,
  },
});
