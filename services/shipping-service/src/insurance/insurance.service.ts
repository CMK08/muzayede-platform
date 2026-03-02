import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface InsurancePremium {
  declaredValue: number;
  premiumRate: number;
  premiumAmount: number;
  carrier: string;
  currency: string;
  coverage: string;
}

export interface InsurancePolicy {
  shipmentId: string;
  policyNumber: string;
  declaredValue: number;
  premiumAmount: number;
  carrier: string;
  coverage: string;
  status: string;
  createdAt: string;
}

export interface InsuranceClaim {
  claimId: string;
  shipmentId: string;
  policyNumber: string;
  reason: string;
  evidence: string[];
  declaredValue: number;
  status: string;
  filedAt: string;
}

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  /**
   * Premium rates by carrier tier.
   */
  private readonly premiumRates: Record<string, number> = {
    UPS: 0.015,
    DHL: 0.018,
    WHITE_GLOVE: 0.025,
    DEFAULT: 0.02,
  };

  /**
   * Value tiers for additional surcharges.
   */
  private readonly valueTiers = [
    { maxValue: 1000, surcharge: 0 },
    { maxValue: 5000, surcharge: 0.005 },
    { maxValue: 25000, surcharge: 0.01 },
    { maxValue: 100000, surcharge: 0.02 },
    { maxValue: Infinity, surcharge: 0.035 },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate insurance premium for a declared value and carrier.
   */
  calculateInsurance(declaredValue: number, carrier: string): InsurancePremium {
    this.logger.log(
      `Calculating insurance: value=${declaredValue}, carrier=${carrier}`,
    );

    if (declaredValue <= 0) {
      throw new BadRequestException('Declared value must be greater than 0');
    }

    const baseRate = this.premiumRates[carrier] || this.premiumRates.DEFAULT;

    // Find the value tier surcharge
    const tier = this.valueTiers.find((t) => declaredValue <= t.maxValue);
    const surcharge = tier ? tier.surcharge : 0.035;

    const totalRate = baseRate + surcharge;
    const premiumAmount =
      Math.round(declaredValue * totalRate * 100) / 100;

    // Minimum premium
    const minimumPremium = 5.0;
    const finalPremium = Math.max(premiumAmount, minimumPremium);

    let coverage: string;
    if (declaredValue <= 1000) {
      coverage = 'Standard Coverage - Loss, theft, and damage during transit';
    } else if (declaredValue <= 25000) {
      coverage =
        'Enhanced Coverage - Full replacement value for loss, theft, damage, and mishandling';
    } else {
      coverage =
        'Premium Coverage - Full replacement value with dedicated claims handler and expedited processing';
    }

    return {
      declaredValue,
      premiumRate: Math.round(totalRate * 10000) / 100, // as percentage
      premiumAmount: finalPremium,
      carrier,
      currency: 'USD',
      coverage,
    };
  }

  /**
   * Add insurance to an existing shipment.
   */
  async addInsurance(
    shipmentId: string,
    declaredValue: number,
  ): Promise<InsurancePolicy> {
    this.logger.log(
      `Adding insurance to shipment ${shipmentId}: value=${declaredValue}`,
    );

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    if (shipment.status === 'DELIVERED' || shipment.status === 'RETURNED') {
      throw new BadRequestException(
        `Cannot add insurance to a shipment in ${shipment.status} status`,
      );
    }

    const premium = this.calculateInsurance(declaredValue, shipment.carrier);
    const policyNumber = this.generatePolicyNumber();

    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          insuranceAmount: declaredValue,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'shipment.insurance_added',
          entityType: 'Shipment',
          entityId: shipmentId,
          metadata: {
            orderId: shipment.orderId,
            policyNumber,
            declaredValue,
            premiumAmount: premium.premiumAmount,
            carrier: shipment.carrier,
            coverage: premium.coverage,
          },
        },
      });
    });

    this.logger.log(
      `Insurance added to shipment ${shipmentId}: policy=${policyNumber}`,
    );

    return {
      shipmentId,
      policyNumber,
      declaredValue,
      premiumAmount: premium.premiumAmount,
      carrier: shipment.carrier,
      coverage: premium.coverage,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * File an insurance claim for a shipment.
   */
  async fileClaim(
    shipmentId: string,
    reason: string,
    evidence: string[],
  ): Promise<InsuranceClaim> {
    this.logger.log(`Filing insurance claim for shipment: ${shipmentId}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    if (!shipment.insuranceAmount || Number(shipment.insuranceAmount) <= 0) {
      throw new BadRequestException(
        'Shipment does not have active insurance. Please add insurance before filing a claim.',
      );
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Claim reason is required');
    }

    if (!evidence || evidence.length === 0) {
      throw new BadRequestException(
        'At least one piece of evidence (photo URL or document URL) is required',
      );
    }

    const claimId = this.generateClaimId();

    // Find the insurance policy number from audit logs
    const policyLog = await this.prisma.auditLog.findFirst({
      where: {
        entityType: 'Shipment',
        entityId: shipmentId,
        action: 'shipment.insurance_added',
      },
      orderBy: { createdAt: 'desc' },
    });

    const policyNumber =
      (policyLog?.metadata as any)?.policyNumber || 'UNKNOWN';

    await this.prisma.auditLog.create({
      data: {
        action: 'shipment.insurance_claim_filed',
        entityType: 'Shipment',
        entityId: shipmentId,
        metadata: {
          claimId,
          orderId: shipment.orderId,
          policyNumber,
          reason,
          evidence,
          declaredValue: Number(shipment.insuranceAmount),
          carrier: shipment.carrier,
          filedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Insurance claim filed: ${claimId} for shipment ${shipmentId}`,
    );

    return {
      claimId,
      shipmentId,
      policyNumber,
      reason,
      evidence,
      declaredValue: Number(shipment.insuranceAmount),
      status: 'PENDING_REVIEW',
      filedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a unique policy number.
   */
  private generatePolicyNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MZ-INS-${timestamp}-${random}`;
  }

  /**
   * Generate a unique claim ID.
   */
  private generateClaimId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MZ-CLM-${timestamp}-${random}`;
  }
}
