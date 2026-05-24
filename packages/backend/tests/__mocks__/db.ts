const mockDb = {
  processedReference: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  pendingMint: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  transaction: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  wallet: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  merchant: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  redemptionRequest: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  rewardMilestone: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  merchantVisit: {
    findMany: jest.fn(),
    create: jest.fn(),
    groupBy: jest.fn(),
  },
  referral: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  userGoldStatus: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  rewardPayoutQueue: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  pendingTransfer: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  gcaReserve: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  gameQuestion: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  questionServe: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((fn: any) => fn(mockDb)),
  $queryRaw: jest.fn(),
};

export function resetMocks() {
  for (const key of Object.keys(mockDb)) {
    const val = (mockDb as any)[key];
    if (typeof val === 'object' && val !== null) {
      for (const method of Object.keys(val)) {
        if (typeof val[method]?.mockReset === 'function') {
          val[method].mockReset();
        }
      }
    } else if (typeof val?.mockReset === 'function') {
      val.mockReset();
    }
  }
  mockDb.$transaction.mockImplementation((fn: any) => fn(mockDb));
  mockDb.pendingTransfer.findMany.mockResolvedValue([]);
}

export default mockDb;
