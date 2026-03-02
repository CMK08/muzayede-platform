import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '@/constants/colors';

interface CategoryChipProps {
  label: string;
  isSelected?: boolean;
  onPress: () => void;
}

export function CategoryChip({
  label,
  isSelected = false,
  onPress,
}: CategoryChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        isSelected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <Text
        style={[styles.chipText, isSelected && styles.chipTextSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  chipTextSelected: {
    color: Colors.textInverse,
  },
});
