import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Image, StyleSheet, Modal, ActivityIndicator, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectGif: (gifUrl: string) => void;
}

const GIPHY_API_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY;

export default function GifPicker({ visible, onClose, onSelectGif }: GifPickerProps) {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);

  // Load trending GIFs on mount
  useEffect(() => {
    if (visible && gifs.length === 0) {
      loadTrending();
    }
  }, [visible]);

  const loadTrending = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=25&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Failed to load trending GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (query: string, loadMore = false) => {
    if (!query.trim()) {
      loadTrending();
      return;
    }
    
    setLoading(true);
    const currentOffset = loadMore ? offset : 0;
    
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=25&offset=${currentOffset}&rating=g`
      );
      const data = await response.json();
      
      if (loadMore) {
        setGifs(prev => [...prev, ...(data.data || [])]);
      } else {
        setGifs(data.data || []);
      }
      setOffset(currentOffset + 25);
    } catch (error) {
      console.error('GIF search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGif = (gif: any) => {
    const gifUrl = gif.images.fixed_height.url;
    onSelectGif(gifUrl);
    onClose();
    setSearch('');
    setGifs([]);
    setOffset(0);
  };

  const handleClose = () => {
    onClose();
    setSearch('');
    setGifs([]);
    setOffset(0);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search GIFs..."
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setOffset(0);
                searchGifs(text);
              }}
              autoFocus
              placeholderTextColor="#999"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearch('');
                loadTrending();
              }}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        {loading && gifs.length === 0 ? (
          <ActivityIndicator size="large" color="#6B4CE6" style={{ marginTop: 40 }} />
        ) : (
          <>
            {gifs.length === 0 && search.length > 0 && !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No GIFs found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            )}
            <FlatList
              data={gifs}
              numColumns={2}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.gifItem} 
                  onPress={() => handleSelectGif(item)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.images.fixed_height_downsampled.url }}
                    style={styles.gifImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.grid}
              onEndReached={() => {
                if (search && !loading) {
                  searchGifs(search, true);
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loading && gifs.length > 0 ? (
                  <ActivityIndicator size="small" color="#6B4CE6" style={{ paddingVertical: 20 }} />
                ) : null
              }
            />
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.poweredBy}>Powered by GIPHY</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: { 
    flexDirection: 'row', 
    padding: 16, 
    paddingTop: 60,
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB', 
    alignItems: 'center' 
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 16, 
    paddingVertical: 10,
    color: '#000',
  },
  closeButton: { 
    marginLeft: 12,
    padding: 4,
  },
  grid: { 
    padding: 8,
    paddingBottom: 80,
  },
  gifItem: { 
    flex: 1, 
    margin: 4, 
    height: 150, 
    borderRadius: 12, 
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  gifImage: { 
    width: '100%', 
    height: '100%' 
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  poweredBy: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
});