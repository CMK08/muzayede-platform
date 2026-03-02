import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Config } from '@/constants/config';
import { PriceDisplay, formatPrice } from './PriceDisplay';

interface BidPanelProps {
  currentPrice: number;
  minIncrement: number;
  onPlaceBid: (amount: number, isAutoBid?: boolean, maxAutoBidAmount?: number) => Promise<void>;
  isLoading?: boolean;
  isConnected?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export function BidPanel({
  currentPrice,
  minIncrement,
  onPlaceBid,
  isLoading = false,
  isConnected = true,
  disabled = false,
  compact = false,
}: BidPanelProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState('');
  const [autoBidEnabled, setAutoBidEnabled] = useState(false);
  const [maxAutoBidAmount, setMaxAutoBidAmount] = useState('');

  const incrementButtons = [
    { label: '+100', value: 100 },
    { label: '+500', value: 500 },
    { label: '+1.000', value: 1000 },
  ];

  const quickBidAmounts = Config.BID_INCREMENT_PERCENTAGES.map((pct) => {
    const increment = Math.ceil((currentPrice * pct) / 100);
    return {
      label: `+%${pct}`,
      amount: currentPrice + Math.max(increment, minIncrement),
    };
  });

  const minimumBid = currentPrice + minIncrement;

  const handleIncrementPress = (value: number) => {
    const currentInput = parseFloat(customAmount.replace(/\./g, '').replace(',', '.')) || minimumBid;
    const newAmount = Math.max(currentInput + value, minimumBid);
    setCustomAmount(newAmount.toString());
    setError('');
  };

  const handleQuickBid = useCallback(
    async (amount: number) => {
      setError('');
      try {
        await onPlaceBid(
          amount,
          autoBidEnabled,
          autoBidEnabled ? parseFloat(maxAutoBidAmount.replace(',', '.')) || undefined : undefined
        );
        setCustomAmount('');
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : 'Teklif verilemedi';
        setError(message);
      }
    },
    [onPlaceBid, autoBidEnabled, maxAutoBidAmount]
  );

  const handleCustomBid = useCallback(async () => {
    setError('');
    const amount = parseFloat(customAmount.replace(/\./g, '').replace(',', '.'));

    if (isNaN(amount) || amount <= 0) {
      setError('Gecerli bir tutar giriniz');
      return;
    }

    if (amount < minimumBid) {
      setError(`Minimum teklif: ${formatPrice(minimumBid)} TL`);
      return;
    }

    if (autoBidEnabled) {
      const maxAmount = parseFloat(maxAutoBidAmount.replace(',', '.'));
      if (isNaN(maxAmount) || maxAmount < amount) {
        setError('Otomatik teklif limiti, teklif tutarindan buyuk olmalidir');
        return;
      }
    }

    try {
      await onPlaceBid(
        amount,
        autoBidEnabled,
        autoBidEnabled ? parseFloat(maxAutoBidAmount.replace(',', '.')) || undefined : undefined
      );
      setCustomAmount('');
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Teklif verilemedi';
      setError(message);
    }
  }, [customAmount, minimumBid, onPlaceBid, autoBidEnabled, maxAutoBidAmount]);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactPriceRow}>
          <Text style={styles.compactPriceLabel}>Guncel:</Text>
          <PriceDisplay amount={currentPrice} size="medium" />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.compactBidButton,
            pressed && styles.bidButtonPressed,
            (disabled || isLoading) && styles.buttonDisabled,
          ]}
          onPress={() => handleQuickBid(minimumBid)}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.textInverse} size="small" />
          ) : (
            <Text style={styles.compactBidButtonText}>
              Teklif Ver ({formatPrice(minimumBid)} TL)
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.container}>
        {!isConnected && (
          <View style={styles.disconnectedBanner}>
            <Text style={styles.disconnectedText}>
              Baglanti kesildi. Yeniden baglaniliyor...
            </Text>
          </View>
        )}

        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>Guncel Fiyat</Text>
          <PriceDisplay amount={currentPrice} size="large" />
          <Text style={styles.minBidText}>
            Minimum teklif: {formatPrice(minimumBid)} TL
          </Text>
        </View>

        {/* Increment Buttons */}
        <View style={styles.incrementContainer}>
          {incrementButtons.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                styles.incrementButton,
                pressed && styles.incrementPressed,
                (disabled || isLoading) && styles.buttonDisabled,
              ]}
              onPress={() => handleIncrementPress(item.value)}
              disabled={disabled || isLoading}
            >
              <Text style={styles.incrementLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Quick Bid Buttons */}
        <View style={styles.quickBidsContainer}>
          {quickBidAmounts.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                styles.quickBidButton,
                pressed && styles.quickBidPressed,
                (disabled || isLoading) && styles.buttonDisabled,
              ]}
              onPress={() => handleQuickBid(item.amount)}
              disabled={disabled || isLoading}
            >
              <Text style={styles.quickBidLabel}>{item.label}</Text>
              <Text style={styles.quickBidAmount}>
                {formatPrice(item.amount)} TL
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Custom Bid Input */}
        <View style={styles.customBidContainer}>
          <TextInput
            style={styles.customInput}
            placeholder="Teklif tutari (TL)"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="decimal-pad"
            value={customAmount}
            onChangeText={(text) => {
              setCustomAmount(text);
              setError('');
            }}
            editable={!disabled && !isLoading}
          />
          <Pressable
            style={({ pressed }) => [
              styles.bidButton,
              pressed && styles.bidButtonPressed,
              (disabled || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleCustomBid}
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.textInverse} size="small" />
            ) : (
              <Text style={styles.bidButtonText}>Teklif Ver</Text>
            )}
          </Pressable>
        </View>

        {/* Auto-Bid Toggle */}
        <View style={styles.autoBidContainer}>
          <View style={styles.autoBidRow}>
            <View style={styles.autoBidInfo}>
              <Text style={styles.autoBidLabel}>Otomatik Teklif</Text>
              <Text style={styles.autoBidDesc}>
                Baskasi sizi gectiginde otomatik teklif verilir
              </Text>
            </View>
            <Switch
              value={autoBidEnabled}
              onValueChange={setAutoBidEnabled}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={autoBidEnabled ? Colors.primary : Colors.textTertiary}
            />
          </View>
          {autoBidEnabled && (
            <TextInput
              style={styles.autoBidInput}
              placeholder="Maksimum teklif limiti (TL)"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="decimal-pad"
              value={maxAutoBidAmount}
              onChangeText={setMaxAutoBidAmount}
              editable={!disabled && !isLoading}
            />
          )}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  compactPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactPriceLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  compactBidButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  compactBidButtonText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
  disconnectedBanner: {
    backgroundColor: Colors.warning,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  disconnectedText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  priceInfo: {
    alignItems: 'center',
    gap: 2,
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  minBidText: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  incrementContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  incrementButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  incrementPressed: {
    backgroundColor: Colors.primaryLight + '15',
    borderColor: Colors.primaryLight,
  },
  incrementLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  quickBidsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBidButton: {
    flex: 1,
    backgroundColor: Colors.primaryLight + '15',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  quickBidPressed: {
    backgroundColor: Colors.primaryLight + '30',
  },
  quickBidLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  quickBidAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  customBidContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  bidButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 110,
  },
  bidButtonPressed: {
    backgroundColor: Colors.accentDark,
  },
  bidButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  autoBidContainer: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  autoBidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoBidInfo: {
    flex: 1,
    gap: 2,
  },
  autoBidLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  autoBidDesc: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  autoBidInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    textAlign: 'center',
  },
});
