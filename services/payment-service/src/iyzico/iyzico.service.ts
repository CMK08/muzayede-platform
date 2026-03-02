import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// ----------------------------------------------------------------
// Interfaces
// ----------------------------------------------------------------

export interface CardDetails {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
  registerCard?: boolean;
}

export interface BuyerInfo {
  id: string;
  name: string;
  surname: string;
  gsmNumber: string;
  email: string;
  identityNumber: string;
  registrationAddress: string;
  ip: string;
  city: string;
  country: string;
  zipCode?: string;
}

export interface BasketItem {
  id: string;
  name: string;
  category1: string;
  category2?: string;
  itemType: 'PHYSICAL' | 'VIRTUAL';
  price: string;
  subMerchantKey?: string;
  subMerchantPrice?: string;
}

export interface SubMerchantInfo {
  name: string;
  gsmNumber: string;
  email: string;
  iban: string;
  identityNumber?: string;
  taxNumber?: string;
  taxOffice?: string;
  legalCompanyTitle?: string;
  subMerchantExternalId: string;
  address: string;
  subMerchantType: 'PERSONAL' | 'PRIVATE_COMPANY' | 'LIMITED_OR_JOINT_STOCK_COMPANY';
  currency?: string;
}

export interface IyzicoPaymentResult {
  status: string;
  paymentId: string;
  conversationId: string;
  fraudStatus: number;
  paidPrice: number;
  currency: string;
  installment: number;
  basketId: string;
  errorMessage?: string;
}

export interface IyzicoPaymentFormResult {
  paymentPageUrl: string;
  token: string;
  tokenExpireTime: string;
  status: string;
}

export interface IyzicoCallbackResult {
  status: string;
  paymentId: string;
  conversationId: string;
  fraudStatus: number;
  paidPrice: number;
  currency: string;
}

export interface IyzicoRefundResult {
  refundId: string;
  status: string;
  price: number;
}

export interface Iyzico3DInitResult {
  status: string;
  threeDSHtmlContent: string;
  paymentId?: string;
  conversationId?: string;
  errorMessage?: string;
}

export interface IyzicoSubMerchantResult {
  status: string;
  subMerchantKey: string;
  errorMessage?: string;
}

export interface InstallmentDetail {
  binNumber: string;
  cardType: string;
  cardAssociation: string;
  cardFamilyName: string;
  installmentPrices: Array<{
    installmentNumber: number;
    totalPrice: number;
    installmentPrice: number;
  }>;
}

export interface IyzicoInstallmentResult {
  status: string;
  installmentDetails: InstallmentDetail[];
  errorMessage?: string;
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

@Injectable()
export class IyzicoService {
  private readonly logger = new Logger(IyzicoService.name);
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly callbackUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('IYZICO_API_KEY', '');
    this.secretKey = this.configService.get<string>('IYZICO_SECRET_KEY', '');
    this.baseUrl = this.configService.get<string>(
      'IYZICO_BASE_URL',
      'https://sandbox-api.iyzipay.com',
    );
    this.callbackUrl = this.configService.get<string>(
      'IYZICO_CALLBACK_URL',
      'http://localhost:3008/api/v1/payments/3d-callback',
    );
  }

  // ----------------------------------------------------------------
  // createPayment - Process a direct credit card payment
  // ----------------------------------------------------------------

  async createPayment(
    amount: number,
    currency: string,
    cardDetails: CardDetails,
    buyerInfo: BuyerInfo,
    basketItems: BasketItem[],
  ): Promise<IyzicoPaymentResult> {
    this.logger.log(
      `Creating payment: amount=${amount} ${currency}, buyer=${buyerInfo.email}`,
    );

    const conversationId = `pay_${Date.now()}`;
    const price = basketItems
      .reduce((sum, item) => sum + parseFloat(item.price), 0)
      .toFixed(2);
    const paidPrice = amount.toFixed(2);

    const requestBody = {
      locale: 'tr',
      conversationId,
      price,
      paidPrice,
      currency: currency || 'TRY',
      installment: 1,
      basketId: `basket_${Date.now()}`,
      paymentChannel: 'WEB',
      paymentGroup: 'PRODUCT',
      paymentCard: {
        cardHolderName: cardDetails.cardHolderName,
        cardNumber: cardDetails.cardNumber,
        expireMonth: cardDetails.expireMonth,
        expireYear: cardDetails.expireYear,
        cvc: cardDetails.cvc,
        registerCard: cardDetails.registerCard ? '1' : '0',
      },
      buyer: {
        id: buyerInfo.id,
        name: buyerInfo.name,
        surname: buyerInfo.surname,
        gsmNumber: buyerInfo.gsmNumber,
        email: buyerInfo.email,
        identityNumber: buyerInfo.identityNumber,
        lastLoginDate: new Date().toISOString().split('T')[0] + ' 00:00:00',
        registrationDate:
          new Date().toISOString().split('T')[0] + ' 00:00:00',
        registrationAddress: buyerInfo.registrationAddress,
        ip: buyerInfo.ip,
        city: buyerInfo.city,
        country: buyerInfo.country,
        zipCode: buyerInfo.zipCode || '34000',
      },
      shippingAddress: {
        contactName: `${buyerInfo.name} ${buyerInfo.surname}`,
        city: buyerInfo.city,
        country: buyerInfo.country,
        address: buyerInfo.registrationAddress,
        zipCode: buyerInfo.zipCode || '34000',
      },
      billingAddress: {
        contactName: `${buyerInfo.name} ${buyerInfo.surname}`,
        city: buyerInfo.city,
        country: buyerInfo.country,
        address: buyerInfo.registrationAddress,
        zipCode: buyerInfo.zipCode || '34000',
      },
      basketItems: basketItems.map((item) => ({
        id: item.id,
        name: item.name,
        category1: item.category1,
        category2: item.category2 || item.category1,
        itemType: item.itemType,
        price: item.price,
        subMerchantKey: item.subMerchantKey,
        subMerchantPrice: item.subMerchantPrice,
      })),
    };

    try {
      const data = await this.makeRequest(
        '/payment/auth',
        requestBody,
      );

      if (data.status === 'success') {
        this.logger.log(`Payment successful: paymentId=${data.paymentId}`);
        return {
          status: data.status,
          paymentId: data.paymentId,
          conversationId: data.conversationId || conversationId,
          fraudStatus: data.fraudStatus || 0,
          paidPrice: parseFloat(data.paidPrice || '0'),
          currency: data.currency || currency,
          installment: data.installment || 1,
          basketId: data.basketId || '',
        };
      }

      this.logger.error(`Payment failed: ${data.errorMessage}`);
      return {
        status: 'failure',
        paymentId: '',
        conversationId,
        fraudStatus: 0,
        paidPrice: 0,
        currency,
        installment: 1,
        basketId: '',
        errorMessage: data.errorMessage,
      };
    } catch (error: any) {
      this.logger.error(`Payment API call failed: ${error.message}`);
      return {
        status: 'failure',
        paymentId: '',
        conversationId,
        fraudStatus: 0,
        paidPrice: 0,
        currency,
        installment: 1,
        basketId: '',
        errorMessage: error.message,
      };
    }
  }

  // ----------------------------------------------------------------
  // create3DSecurePayment - Initiate 3D Secure payment
  // ----------------------------------------------------------------

  async create3DSecurePayment(
    amount: number,
    currency: string,
    cardDetails: CardDetails,
    buyerInfo: BuyerInfo,
    basketItems: BasketItem[],
  ): Promise<Iyzico3DInitResult> {
    this.logger.log(
      `Initiating 3D Secure payment: amount=${amount} ${currency}`,
    );

    const conversationId = `3d_${Date.now()}`;
    const price = basketItems
      .reduce((sum, item) => sum + parseFloat(item.price), 0)
      .toFixed(2);
    const paidPrice = amount.toFixed(2);

    const requestBody = {
      locale: 'tr',
      conversationId,
      price,
      paidPrice,
      currency: currency || 'TRY',
      installment: 1,
      basketId: `basket_${Date.now()}`,
      paymentChannel: 'WEB',
      paymentGroup: 'PRODUCT',
      callbackUrl: this.callbackUrl,
      paymentCard: {
        cardHolderName: cardDetails.cardHolderName,
        cardNumber: cardDetails.cardNumber,
        expireMonth: cardDetails.expireMonth,
        expireYear: cardDetails.expireYear,
        cvc: cardDetails.cvc,
        registerCard: cardDetails.registerCard ? '1' : '0',
      },
      buyer: {
        id: buyerInfo.id,
        name: buyerInfo.name,
        surname: buyerInfo.surname,
        gsmNumber: buyerInfo.gsmNumber,
        email: buyerInfo.email,
        identityNumber: buyerInfo.identityNumber,
        lastLoginDate: new Date().toISOString().split('T')[0] + ' 00:00:00',
        registrationDate:
          new Date().toISOString().split('T')[0] + ' 00:00:00',
        registrationAddress: buyerInfo.registrationAddress,
        ip: buyerInfo.ip,
        city: buyerInfo.city,
        country: buyerInfo.country,
        zipCode: buyerInfo.zipCode || '34000',
      },
      shippingAddress: {
        contactName: `${buyerInfo.name} ${buyerInfo.surname}`,
        city: buyerInfo.city,
        country: buyerInfo.country,
        address: buyerInfo.registrationAddress,
        zipCode: buyerInfo.zipCode || '34000',
      },
      billingAddress: {
        contactName: `${buyerInfo.name} ${buyerInfo.surname}`,
        city: buyerInfo.city,
        country: buyerInfo.country,
        address: buyerInfo.registrationAddress,
        zipCode: buyerInfo.zipCode || '34000',
      },
      basketItems: basketItems.map((item) => ({
        id: item.id,
        name: item.name,
        category1: item.category1,
        category2: item.category2 || item.category1,
        itemType: item.itemType,
        price: item.price,
      })),
    };

    try {
      const data = await this.makeRequest(
        '/payment/3dsecure/initialize',
        requestBody,
      );

      if (data.status === 'success') {
        this.logger.log(`3D Secure init successful`);
        return {
          status: data.status,
          threeDSHtmlContent: data.threeDSHtmlContent || '',
          paymentId: data.paymentId,
          conversationId: data.conversationId || conversationId,
        };
      }

      this.logger.error(`3D Secure init failed: ${data.errorMessage}`);
      return {
        status: 'failure',
        threeDSHtmlContent: '',
        errorMessage: data.errorMessage,
      };
    } catch (error: any) {
      this.logger.error(`3D Secure API call failed: ${error.message}`);
      return {
        status: 'failure',
        threeDSHtmlContent: '',
        errorMessage: error.message,
      };
    }
  }

  // ----------------------------------------------------------------
  // retrievePayment - Get payment details from iyzico
  // ----------------------------------------------------------------

  async retrievePayment(paymentId: string): Promise<any> {
    this.logger.log(`Retrieving payment details: ${paymentId}`);

    const requestBody = {
      locale: 'tr',
      paymentId,
    };

    try {
      const data = await this.makeRequest('/payment/detail', requestBody);
      return data;
    } catch (error: any) {
      this.logger.error(`retrievePayment failed: ${error.message}`);
      return null;
    }
  }

  // ----------------------------------------------------------------
  // cancelPayment - Cancel / refund a payment
  // ----------------------------------------------------------------

  async cancelPayment(paymentId: string): Promise<IyzicoRefundResult> {
    this.logger.log(`Cancelling payment: ${paymentId}`);

    const requestBody = {
      locale: 'tr',
      paymentId,
      ip: '85.34.78.112',
    };

    try {
      const data = await this.makeRequest('/payment/cancel', requestBody);

      return {
        refundId: data.paymentId || paymentId,
        status: data.status || 'failure',
        price: parseFloat(data.price || '0'),
      };
    } catch (error: any) {
      this.logger.error(`Cancel payment failed: ${error.message}`);
      return {
        refundId: paymentId,
        status: 'failure',
        price: 0,
      };
    }
  }

  // ----------------------------------------------------------------
  // createSubMerchant - Register a seller as sub-merchant
  // ----------------------------------------------------------------

  async createSubMerchant(
    sellerInfo: SubMerchantInfo,
  ): Promise<IyzicoSubMerchantResult> {
    this.logger.log(
      `Creating sub-merchant: ${sellerInfo.name} (${sellerInfo.subMerchantExternalId})`,
    );

    const requestBody = {
      locale: 'tr',
      conversationId: `submerchant_${Date.now()}`,
      name: sellerInfo.name,
      gsmNumber: sellerInfo.gsmNumber,
      email: sellerInfo.email,
      iban: sellerInfo.iban,
      address: sellerInfo.address,
      subMerchantExternalId: sellerInfo.subMerchantExternalId,
      subMerchantType: sellerInfo.subMerchantType,
      currency: sellerInfo.currency || 'TRY',
      ...(sellerInfo.identityNumber && {
        identityNumber: sellerInfo.identityNumber,
      }),
      ...(sellerInfo.taxNumber && { taxNumber: sellerInfo.taxNumber }),
      ...(sellerInfo.taxOffice && { taxOffice: sellerInfo.taxOffice }),
      ...(sellerInfo.legalCompanyTitle && {
        legalCompanyTitle: sellerInfo.legalCompanyTitle,
      }),
    };

    try {
      const data = await this.makeRequest(
        '/onboarding/submerchant',
        requestBody,
      );

      if (data.status === 'success') {
        this.logger.log(
          `Sub-merchant created: key=${data.subMerchantKey}`,
        );
        return {
          status: data.status,
          subMerchantKey: data.subMerchantKey || '',
        };
      }

      this.logger.error(`Sub-merchant creation failed: ${data.errorMessage}`);
      return {
        status: 'failure',
        subMerchantKey: '',
        errorMessage: data.errorMessage,
      };
    } catch (error: any) {
      this.logger.error(`Sub-merchant API call failed: ${error.message}`);
      return {
        status: 'failure',
        subMerchantKey: '',
        errorMessage: error.message,
      };
    }
  }

  // ----------------------------------------------------------------
  // calculateInstallments - Get installment options for a BIN
  // ----------------------------------------------------------------

  async calculateInstallments(
    binNumber: string,
    price: number,
  ): Promise<IyzicoInstallmentResult> {
    this.logger.log(
      `Calculating installments: bin=${binNumber}, price=${price}`,
    );

    const requestBody = {
      locale: 'tr',
      conversationId: `inst_${Date.now()}`,
      binNumber: binNumber.substring(0, 6),
      price: price.toFixed(2),
    };

    try {
      const data = await this.makeRequest(
        '/payment/iyzipos/installment',
        requestBody,
      );

      if (data.status === 'success') {
        const details: InstallmentDetail[] = (
          data.installmentDetails || []
        ).map((detail: any) => ({
          binNumber: detail.binNumber || binNumber,
          cardType: detail.cardType || '',
          cardAssociation: detail.cardAssociation || '',
          cardFamilyName: detail.cardFamilyName || '',
          installmentPrices: (detail.installmentPrices || []).map(
            (ip: any) => ({
              installmentNumber: ip.installmentNumber || 1,
              totalPrice: parseFloat(ip.totalPrice || '0'),
              installmentPrice: parseFloat(ip.installmentPrice || '0'),
            }),
          ),
        }));

        return {
          status: 'success',
          installmentDetails: details,
        };
      }

      return {
        status: 'failure',
        installmentDetails: [],
        errorMessage: data.errorMessage,
      };
    } catch (error: any) {
      this.logger.error(`Installment calc failed: ${error.message}`);
      return {
        status: 'failure',
        installmentDetails: [],
        errorMessage: error.message,
      };
    }
  }

  // ----------------------------------------------------------------
  // createPaymentForm - Checkout form (existing method, kept for compatibility)
  // ----------------------------------------------------------------

  async createPaymentForm(
    payment: { id: string; amount: number; currency: string },
    order: {
      id: string;
      orderNumber: string;
      hammerPrice: number;
      buyerCommission: number;
      auctionId: string;
    },
    buyer: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      address: string;
      city: string;
      country: string;
      ip: string;
    },
  ): Promise<IyzicoPaymentFormResult> {
    this.logger.log(
      `Creating iyzico payment form: amount=${payment.amount} ${payment.currency}, order=${order.orderNumber}`,
    );

    const conversationId = order.id;
    const paidPrice = payment.amount.toFixed(2);
    const price = order.hammerPrice.toFixed(2);

    const requestBody = {
      locale: 'tr',
      conversationId,
      price,
      paidPrice,
      currency: payment.currency === 'TRY' ? 'TRY' : payment.currency,
      basketId: order.orderNumber,
      paymentGroup: 'PRODUCT',
      callbackUrl: this.callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: {
        id: buyer.id,
        name: buyer.firstName,
        surname: buyer.lastName,
        gsmNumber: buyer.phone || '+905000000000',
        email: buyer.email,
        identityNumber: '11111111111',
        lastLoginDate: new Date().toISOString().split('T')[0] + ' 00:00:00',
        registrationDate:
          new Date().toISOString().split('T')[0] + ' 00:00:00',
        registrationAddress: buyer.address || 'Istanbul, Turkey',
        ip: buyer.ip || '85.34.78.112',
        city: buyer.city || 'Istanbul',
        country: buyer.country || 'Turkey',
        zipCode: '34000',
      },
      shippingAddress: {
        contactName: `${buyer.firstName} ${buyer.lastName}`,
        city: buyer.city || 'Istanbul',
        country: buyer.country || 'Turkey',
        address: buyer.address || 'Istanbul, Turkey',
        zipCode: '34000',
      },
      billingAddress: {
        contactName: `${buyer.firstName} ${buyer.lastName}`,
        city: buyer.city || 'Istanbul',
        country: buyer.country || 'Turkey',
        address: buyer.address || 'Istanbul, Turkey',
        zipCode: '34000',
      },
      basketItems: [
        {
          id: order.auctionId,
          name: `Muzayede Urun - ${order.orderNumber}`,
          category1: 'Muzayede',
          category2: 'Sanat Eseri',
          itemType: 'PHYSICAL',
          price: price,
        },
      ],
    };

    try {
      const data = await this.makeRequest(
        '/payment/iyzipos/checkoutform/initialize/auth/ecom',
        requestBody,
      );

      if (data.status === 'success') {
        this.logger.log(`Iyzico payment form created: token=${data.token}`);
        return {
          paymentPageUrl: data.paymentPageUrl || data.checkoutFormContent,
          token: data.token,
          tokenExpireTime: data.tokenExpireTime?.toString() || '',
          status: data.status,
        };
      }

      this.logger.error(`Iyzico payment form failed: ${data.errorMessage}`);
      return {
        paymentPageUrl: `${this.baseUrl}/payment/checkout?token=pending_${payment.id}`,
        token: `token_${payment.id}`,
        tokenExpireTime: new Date(Date.now() + 1800000).toISOString(),
        status: 'pending',
      };
    } catch (error: any) {
      this.logger.error(`Iyzico API call failed: ${error.message}`);
      return {
        paymentPageUrl: `${this.baseUrl}/payment/checkout?token=pending_${payment.id}`,
        token: `token_${payment.id}`,
        tokenExpireTime: new Date(Date.now() + 1800000).toISOString(),
        status: 'pending',
      };
    }
  }

  // ----------------------------------------------------------------
  // verifyCallback - Verify callback token from iyzico
  // ----------------------------------------------------------------

  async verifyCallback(token: string): Promise<IyzicoCallbackResult> {
    this.logger.log(
      `Verifying iyzico callback token: ${token.substring(0, 20)}...`,
    );

    const requestBody = {
      locale: 'tr',
      token,
    };

    try {
      const data = await this.makeRequest(
        '/payment/iyzipos/checkoutform/auth/ecom/detail',
        requestBody,
      );

      return {
        status: data.status || 'failure',
        paymentId: data.paymentId || '',
        conversationId: data.conversationId || '',
        fraudStatus: data.fraudStatus || 0,
        paidPrice: parseFloat(data.paidPrice || '0'),
        currency: data.currency || 'TRY',
      };
    } catch (error: any) {
      this.logger.error(
        `Iyzico callback verification failed: ${error.message}`,
      );
      return {
        status: 'failure',
        paymentId: '',
        conversationId: '',
        fraudStatus: -1,
        paidPrice: 0,
        currency: 'TRY',
      };
    }
  }

  // ----------------------------------------------------------------
  // processRefund - Process a refund via iyzico API
  // ----------------------------------------------------------------

  async processRefund(payment: {
    providerRef: string;
    amount: number;
    currency: string;
  }): Promise<IyzicoRefundResult> {
    this.logger.log(
      `Processing refund: providerRef=${payment.providerRef}, amount=${payment.amount}`,
    );

    const requestBody = {
      locale: 'tr',
      paymentTransactionId: payment.providerRef,
      price: payment.amount.toFixed(2),
      currency: payment.currency || 'TRY',
      ip: '85.34.78.112',
    };

    try {
      const data = await this.makeRequest('/payment/refund', requestBody);

      return {
        refundId: data.paymentTransactionId || `ref_${Date.now()}`,
        status: data.status || 'failure',
        price: parseFloat(data.price || '0'),
      };
    } catch (error: any) {
      this.logger.error(`Iyzico refund failed: ${error.message}`);
      return {
        refundId: `ref_${Date.now()}`,
        status: 'failure',
        price: 0,
      };
    }
  }

  // ----------------------------------------------------------------
  // getPaymentDetails - Retrieve payment details (legacy alias)
  // ----------------------------------------------------------------

  async getPaymentDetails(paymentId: string): Promise<any> {
    return this.retrievePayment(paymentId);
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private async makeRequest(uri: string, body: any): Promise<any> {
    const bodyStr = JSON.stringify(body);
    const rnd = this.generateRandomString();
    const authorizationHeader = this.generateAuthorizationHeader(rnd, bodyStr);

    const response = await fetch(`${this.baseUrl}${uri}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorizationHeader,
        'x-iyzi-rnd': rnd,
      },
      body: bodyStr,
    });

    return response.json();
  }

  private generateAuthorizationHeader(rnd: string, body: string): string {
    const hashStr = this.apiKey + rnd + this.secretKey + body;
    const hash = crypto.createHash('sha1').update(hashStr).digest('base64');
    const authorizationParams = `apiKey:${this.apiKey}&randomHeaderValue:${rnd}&signature:${hash}`;
    return `IYZWS ${Buffer.from(authorizationParams).toString('base64')}`;
  }

  private generateRandomString(): string {
    return `${Date.now()}${Math.random().toString(36).substring(2, 11)}`;
  }
}
