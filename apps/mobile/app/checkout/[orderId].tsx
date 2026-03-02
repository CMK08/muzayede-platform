import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { formatPrice } from '@/components/PriceDisplay';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState';
import {
  fetchOrderSummary,
  processCardPayment,
  confirmBankTransfer,
  type OrderSummary,
  type CardPaymentRequest,
  type PaymentResult,
} from '@/services/api';

type PaymentMethod = 'CREDIT_CARD' | 'BANK_TRANSFER';

function formatCardNumber(text: string): string {
  const cleaned = text.replace(/\D/g, '').slice(0, 16);
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(' ') : cleaned;
}

function formatExpiry(text: string): string {
  const cleaned = text.replace(/\D/g, '').slice(0, 4);
  if (cleaned.length > 2) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  }
  return cleaned;
}

export default function CheckoutScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CREDIT_CARD');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  // Fetch order summary
  const {
    data: summary,
    isLoading,
    error,
  } = useQuery<OrderSummary>({
    queryKey: ['orderSummary', orderId],
    queryFn: () => fetchOrderSummary(orderId!),
    enabled: !!orderId,
  });

  // Card payment mutation
  const cardPaymentMutation = useMutation<PaymentResult, Error, CardPaymentRequest>({
    mutationFn: processCardPayment,
    onSuccess: (result) => {
      if (result.success) {
        Alert.alert(
          'Odeme Basarili',
          'Odemeniz basariyla tamamlandi. Siparisiniz hazirlaniyor.',
          [
            {
              text: 'Siparisi Goruntule',
              onPress: () => router.replace(`/order/${orderId}`),
            },
          ]
        );
      } else {
        Alert.alert('Odeme Basarisiz', result.message ?? 'Odeme islenemedi. Lutfen tekrar deneyin.');
      }
    },
    onError: () => {
      Alert.alert('Hata', 'Odeme sirasinda bir hata olustu. Lutfen tekrar deneyin.');
    },
  });

  // Bank transfer mutation
  const bankTransferMutation = useMutation({
    mutationFn: () => confirmBankTransfer(orderId!),
    onSuccess: () => {
      Alert.alert(
        'Havale Talebi Olusturuldu',
        'Havale/EFT bilgileriniz e-posta adresinize gonderildi. Odemeniz onaylandiktan sonra siparisiz isleme alinacaktir.',
        [
          {
            text: 'Tamam',
            onPress: () => router.replace(`/order/${orderId}`),
          },
        ]
      );
    },
    onError: () => {
      Alert.alert('Hata', 'Islem sirasinda bir hata olustu.');
    },
  });

  const validateCard = useCallback((): boolean => {
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 16) {
      Alert.alert('Hata', 'Gecerli bir kart numarasi giriniz');
      return false;
    }

    const cleanExpiry = cardExpiry.replace('/', '');
    if (cleanExpiry.length < 4) {
      Alert.alert('Hata', 'Gecerli bir son kullanma tarihi giriniz');
      return false;
    }

    if (cardCvv.length < 3) {
      Alert.alert('Hata', 'Gecerli bir CVV giriniz');
      return false;
    }

    if (cardHolder.trim().length < 3) {
      Alert.alert('Hata', 'Kart uzerindeki ismi giriniz');
      return false;
    }

    return true;
  }, [cardNumber, cardExpiry, cardCvv, cardHolder]);

  const handlePayment = useCallback(() => {
    if (paymentMethod === 'CREDIT_CARD') {
      if (!validateCard()) return;

      const cleanExpiry = cardExpiry.replace('/', '');
      cardPaymentMutation.mutate({
        orderId: orderId!,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expiryMonth: cleanExpiry.slice(0, 2),
        expiryYear: cleanExpiry.slice(2, 4),
        cvv: cardCvv,
        cardHolderName: cardHolder.trim(),
      });
    } else {
      bankTransferMutation.mutate();
    }
  }, [
    paymentMethod,
    validateCard,
    cardExpiry,
    cardNumber,
    cardCvv,
    cardHolder,
    orderId,
    cardPaymentMutation,
    bankTransferMutation,
  ]);

  const isProcessing = cardPaymentMutation.isPending || bankTransferMutation.isPending;

  if (isLoading) {
    return <LoadingSkeleton variant="detail" />;
  }

  if (error || !summary) {
    return (
      <EmptyState
        title="Siparis Bulunamadi"
        message="Siparis bilgileri yuklenemedi."
        actionLabel="Geri Don"
        onAction={() => router.back()}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Siparis Ozeti</Text>

          <View style={styles.orderSummaryCard}>
            {summary.productImage && (
              <Image
                source={{ uri: summary.productImage }}
                style={styles.productImage}
                contentFit="cover"
                transition={200}
              />
            )}
            <View style={styles.orderDetails}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {summary.auctionTitle}
              </Text>
              <View style={styles.priceBreakdown}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceRowLabel}>Dusme Fiyati</Text>
                  <Text style={styles.priceRowValue}>
                    {formatPrice(summary.hammerPrice)} TL
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceRowLabel}>
                    Komisyon (%{summary.commissionRate})
                  </Text>
                  <Text style={styles.priceRowValue}>
                    {formatPrice(summary.commission)} TL
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceRowLabel}>
                    KDV (%{summary.vatRate})
                  </Text>
                  <Text style={styles.priceRowValue}>
                    {formatPrice(summary.vat)} TL
                  </Text>
                </View>
                <View style={styles.priceDivider} />
                <View style={styles.priceRow}>
                  <Text style={styles.totalLabel}>Toplam</Text>
                  <Text style={styles.totalValue}>
                    {formatPrice(summary.total)} TL
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Odeme Yontemi</Text>

          <Pressable
            onPress={() => setPaymentMethod('CREDIT_CARD')}
            style={[
              styles.paymentOption,
              paymentMethod === 'CREDIT_CARD' && styles.paymentOptionSelected,
            ]}
          >
            <View style={styles.paymentOptionRadio}>
              <View
                style={[
                  styles.radioOuter,
                  paymentMethod === 'CREDIT_CARD' && styles.radioOuterSelected,
                ]}
              >
                {paymentMethod === 'CREDIT_CARD' && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </View>
            <View style={styles.paymentOptionContent}>
              <Text style={styles.paymentOptionTitle}>
                Kredi / Banka Karti
              </Text>
              <Text style={styles.paymentOptionDesc}>
                Visa, Mastercard, Troy
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setPaymentMethod('BANK_TRANSFER')}
            style={[
              styles.paymentOption,
              paymentMethod === 'BANK_TRANSFER' && styles.paymentOptionSelected,
            ]}
          >
            <View style={styles.paymentOptionRadio}>
              <View
                style={[
                  styles.radioOuter,
                  paymentMethod === 'BANK_TRANSFER' && styles.radioOuterSelected,
                ]}
              >
                {paymentMethod === 'BANK_TRANSFER' && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </View>
            <View style={styles.paymentOptionContent}>
              <Text style={styles.paymentOptionTitle}>
                Havale / EFT
              </Text>
              <Text style={styles.paymentOptionDesc}>
                Banka havalesi ile odeme
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Credit Card Form */}
        {paymentMethod === 'CREDIT_CARD' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kart Bilgileri</Text>

            <View style={styles.cardForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kart Numarasi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={19}
                  value={cardNumber}
                  onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                  editable={!isProcessing}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Son Kullanma</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="AA/YY"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={5}
                    value={cardExpiry}
                    onChangeText={(text) => setCardExpiry(formatExpiry(text))}
                    editable={!isProcessing}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="***"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    value={cardCvv}
                    onChangeText={setCardCvv}
                    editable={!isProcessing}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kart Uzerindeki Isim</Text>
                <TextInput
                  style={styles.input}
                  placeholder="AD SOYAD"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="characters"
                  value={cardHolder}
                  onChangeText={setCardHolder}
                  editable={!isProcessing}
                />
              </View>
            </View>
          </View>
        )}

        {/* Bank Transfer Info */}
        {paymentMethod === 'BANK_TRANSFER' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Havale Bilgileri</Text>
            <View style={styles.bankInfoCard}>
              <Text style={styles.bankInfoText}>
                Havale/EFT secenegi ile odeme yaptiginizda, banka bilgileri
                e-posta adresinize gonderilecektir. Odemeniz onaylandiktan
                sonra siparisiz isleme alinacaktir.
              </Text>
              <View style={styles.bankInfoRow}>
                <Text style={styles.bankInfoLabel}>Odeme Suresi:</Text>
                <Text style={styles.bankInfoValue}>48 saat</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Payment Button */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomTotalRow}>
          <Text style={styles.bottomTotalLabel}>Toplam</Text>
          <Text style={styles.bottomTotalValue}>
            {formatPrice(summary.total)} TL
          </Text>
        </View>
        <Pressable
          onPress={handlePayment}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.payButton,
            pressed && styles.payButtonPressed,
            isProcessing && styles.buttonDisabled,
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color={Colors.textInverse} size="small" />
          ) : (
            <Text style={styles.payButtonText}>
              {paymentMethod === 'CREDIT_CARD'
                ? 'Odemeyi Tamamla'
                : 'Havale Talebi Olustur'}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.surface,
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  orderSummaryCard: {
    flexDirection: 'row',
    gap: 14,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  orderDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  priceBreakdown: {
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRowLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  priceRowValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  priceDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.accent,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  paymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '08',
  },
  paymentOptionRadio: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  paymentOptionContent: {
    flex: 1,
    gap: 2,
  },
  paymentOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentOptionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardForm: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bankInfoCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  bankInfoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bankInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankInfoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  bankInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  bottomBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 10,
  },
  bottomTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomTotalLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  bottomTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.accent,
  },
  payButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  payButtonPressed: {
    opacity: 0.85,
  },
  payButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
