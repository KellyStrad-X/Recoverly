import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  videoId: string;
  videoTitle?: string;
  onClose: () => void;
}

export default function YouTubeModal({ visible, videoId, videoTitle, onClose }: Props) {
  const [embedError, setEmbedError] = useState(false);

  // Decode HTML entities in title (e.g., &#39; -> ')
  const decodeHTMLEntities = (text: string | undefined) => {
    if (!text) return 'Exercise Tutorial';
    return text
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  };

  const decodedTitle = decodeHTMLEntities(videoTitle);

  // YouTube embed HTML for mobile WebView compatibility
  // Using HTML string approach is more reliable than direct URI for React Native
  const embedHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          * { margin: 0; padding: 0; }
          html, body { height: 100%; width: 100%; background: #000; }
          .video-container { position: relative; width: 100%; height: 100%; }
          iframe {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        <div class="video-container">
          <iframe
            src="https://www.youtube.com/embed/${videoId}?autoplay=0&playsinline=1&modestbranding=1&rel=0&enablejsapi=1"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </body>
    </html>
  `;

  // Handle opening video in YouTube app
  const openInYouTube = async () => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const youtubeAppUrl = `vnd.youtube://watch?v=${videoId}`;

    try {
      // Try YouTube app first
      const canOpen = await Linking.canOpenURL(youtubeAppUrl);
      if (canOpen) {
        await Linking.openURL(youtubeAppUrl);
      } else {
        // Fallback to browser
        await Linking.openURL(youtubeUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open YouTube');
    }
  };

  // Reset error state when modal opens
  React.useEffect(() => {
    if (visible) {
      setEmbedError(false);
    }
  }, [visible]);

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
                {decodedTitle}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Video Player */}
          <View style={styles.videoContainer}>
            {embedError ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#8E8E93" />
                <Text style={styles.errorTitle}>Video Cannot Be Embedded</Text>
                <Text style={styles.errorText}>
                  This video's owner has disabled embedding. Tap below to watch on YouTube.
                </Text>
                <Button
                  mode="contained"
                  onPress={openInYouTube}
                  style={styles.youtubeButton}
                  labelStyle={styles.youtubeButtonLabel}
                  icon="youtube"
                >
                  Open in YouTube
                </Button>
              </View>
            ) : (
              <WebView
                source={{ html: embedHtml }}
                allowsFullscreenVideo
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scrollEnabled={false}
                bounces={false}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('WebView error:', nativeEvent);
                  setEmbedError(true);
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('WebView HTTP error:', nativeEvent.statusCode);
                  if (nativeEvent.statusCode >= 400) {
                    setEmbedError(true);
                  }
                }}
              />
            )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#000000',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  youtubeButton: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
  },
  youtubeButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
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
