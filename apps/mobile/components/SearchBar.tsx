import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
  FlatList,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { storage } from '@/lib/storage';
import { Config } from '@/constants/config';

interface SearchBarProps {
  value?: string;
  onSearch: (query: string) => void;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  showHistory?: boolean;
}

export function SearchBar({
  value,
  onSearch,
  onChangeText,
  placeholder = 'Muzayede ara...',
  autoFocus = false,
  showHistory = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(value ?? '');
  const [history, setHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const loadHistory = useCallback(async () => {
    const items = await storage.getStringArray(
      Config.STORAGE_KEYS.SEARCH_HISTORY
    );
    setHistory(items);
  }, []);

  const handleFocus = () => {
    if (showHistory) {
      loadHistory();
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding to allow press on suggestions
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSubmit = async () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;

    await storage.appendToStringArray(
      Config.STORAGE_KEYS.SEARCH_HISTORY,
      trimmed,
      20
    );
    setShowSuggestions(false);
    onSearch(trimmed);
  };

  const handleChange = (text: string) => {
    setQuery(text);
    onChangeText?.(text);
  };

  const handleSelectHistory = (item: string) => {
    setQuery(item);
    setShowSuggestions(false);
    onSearch(item);
  };

  const handleClear = () => {
    setQuery('');
    onChangeText?.('');
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={styles.searchIcon}>Q</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {query.length > 0 && (
          <Pressable onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearIcon}>x</Text>
          </Pressable>
        )}
      </View>

      {showSuggestions && history.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Son Aramalar</Text>
          <FlatList
            data={history}
            keyExtractor={(item, index) => `${item}-${index}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.suggestionItem}
                onPress={() => handleSelectHistory(item)}
              >
                <Text style={styles.historyIcon}>~</Text>
                <Text style={styles.suggestionText}>{item}</Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
    color: Colors.textTertiary,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: Colors.textTertiary,
    fontWeight: '700',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 250,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  historyIcon: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.text,
  },
});
