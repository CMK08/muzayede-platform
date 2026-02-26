import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Matches the AuctionStatus enum from the Prisma schema.
 */
export enum AuctionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PRE_BID = 'PRE_BID',
  LIVE = 'LIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export type AuctionAction =
  | 'PUBLISH'
  | 'START_PRE_BID'
  | 'START'
  | 'END'
  | 'CANCEL'
  | 'ARCHIVE';

interface Transition {
  from: AuctionStatus[];
  to: AuctionStatus;
}

@Injectable()
export class AuctionStateMachine {
  private readonly transitions: Record<AuctionAction, Transition> = {
    PUBLISH: {
      from: [AuctionStatus.DRAFT],
      to: AuctionStatus.PUBLISHED,
    },
    START_PRE_BID: {
      from: [AuctionStatus.PUBLISHED],
      to: AuctionStatus.PRE_BID,
    },
    START: {
      from: [AuctionStatus.PUBLISHED, AuctionStatus.PRE_BID],
      to: AuctionStatus.LIVE,
    },
    END: {
      from: [AuctionStatus.LIVE],
      to: AuctionStatus.COMPLETED,
    },
    CANCEL: {
      from: [
        AuctionStatus.DRAFT,
        AuctionStatus.PUBLISHED,
        AuctionStatus.PRE_BID,
        AuctionStatus.LIVE,
      ],
      to: AuctionStatus.CANCELLED,
    },
    ARCHIVE: {
      from: [AuctionStatus.COMPLETED, AuctionStatus.CANCELLED],
      to: AuctionStatus.ARCHIVED,
    },
  };

  transition(currentStatus: AuctionStatus | string, action: AuctionAction): AuctionStatus {
    const transitionDef = this.transitions[action];

    if (!transitionDef) {
      throw new BadRequestException(`Unknown action: ${action}`);
    }

    if (!transitionDef.from.includes(currentStatus as AuctionStatus)) {
      throw new BadRequestException(
        `Cannot perform action '${action}' on auction in status '${currentStatus}'. ` +
          `Allowed from statuses: [${transitionDef.from.join(', ')}]`,
      );
    }

    return transitionDef.to;
  }

  getAvailableActions(currentStatus: AuctionStatus | string): AuctionAction[] {
    return Object.entries(this.transitions)
      .filter(([, def]) => def.from.includes(currentStatus as AuctionStatus))
      .map(([action]) => action as AuctionAction);
  }

  canTransition(currentStatus: AuctionStatus | string, action: AuctionAction): boolean {
    const transitionDef = this.transitions[action];
    if (!transitionDef) return false;
    return transitionDef.from.includes(currentStatus as AuctionStatus);
  }
}
