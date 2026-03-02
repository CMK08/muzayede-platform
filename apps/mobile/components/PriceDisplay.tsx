import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface PriceDisplayProps {
  amount: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  strikethrough?: boolean;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function PriceDisplay({
  amount,
  size = 'medium',
  color,
  strikethrough = false,
}: PriceDisplayProps) {
  const sizeStyle = sizeStyles[size];

  return (
    <Text
      style={[
        styles.base,
        sizeStyle,
        color ? { color } : null,
        strikethrough && styles.strikethrough,
      ]}
    >
      {formatPrice(amount)} TL
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: '700',
    color: Colors.accent,
    fontVariant: ['tabular-nums'],
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
    fontWeight: '400',
  },
});

const sizeStyles = StyleSheet.create({
  small: {
    fontSize: 13,
  },
  medium: {
    fontSize: 16,
  },
  large: {
    fontSize: 22,
  },
});
