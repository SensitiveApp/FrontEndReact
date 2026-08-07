import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type Suggestion = {
  place_id: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
};

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  suggestions: Suggestion[];
  onSelectSuggestion: (placeId: string, description: string) => void;
  style?: ViewStyle;
}

const PRIMARY = '#007AFF';

export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  suggestions,
  onSelectSuggestion,
  style,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Rechercher un lieu, une adresse..."
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((item, index) => (
            <Pressable
              key={item.place_id}
              style={({ pressed }) => [
                styles.suggestionItem,
                index < suggestions.length - 1 && styles.suggestionBorder,
                pressed && styles.suggestionPressed,
              ]}
              onPress={() => onSelectSuggestion(item.place_id, item.description)}
            >
              <Ionicons
                name="location-outline"
                size={16}
                color="#9CA3AF"
                style={styles.suggestionIcon}
              />
              <View style={styles.suggestionTextWrapper}>
                <Text style={styles.suggestionMain} numberOfLines={1}>
                  {item.mainText ?? item.description}
                </Text>
                {item.secondaryText ? (
                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {item.secondaryText}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...CARD_SHADOW,
  },
  inputRowFocused: {
    borderColor: PRIMARY,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    paddingVertical: 0,
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  suggestionPressed: {
    backgroundColor: '#F5F7FA',
  },
  suggestionIcon: {
    marginRight: 10,
    flexShrink: 0,
  },
  suggestionTextWrapper: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  suggestionSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
});
