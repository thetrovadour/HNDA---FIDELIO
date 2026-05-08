import { PrismaClient } from '@prisma/client';

interface ChecklistResult {
  wallet_address: boolean;
  contact_email: boolean;
  category: boolean;
  name: boolean;
  owner_user_id: boolean;
}

function evaluateChecklist(merchant: {
  wallet_address: string | null;
  contact_email: string;
  category: string;
  name: string;
  owner_user_id: string | null;
}): ChecklistResult {
  return {
    wallet_address: !!merchant.wallet_address,
    contact_email: !!merchant.contact_email,
    category: !!merchant.category,
    name: !!merchant.name,
    owner_user_id: !!merchant.owner_user_id,
  };
}

export async function checkAndActivate(db: PrismaClient, merchantId: string): Promise<void> {
  const merchant = await db.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) return;
  if (merchant.merchant_status !== 'PENDING_ACTIVATION') return;

  const checklist = evaluateChecklist(merchant);
  const allPass = Object.values(checklist).every(Boolean);

  if (allPass) {
    await db.merchant.update({
      where: { id: merchantId },
      data: {
        merchant_status: 'ACTIVE',
        activation_checklist: checklist,
      },
    });
  }
}

export async function deactivateMerchant(
  db: PrismaClient,
  merchantId: string,
  reason: string,
  triggeredBy: string,
): Promise<void> {
  await db.merchant.update({
    where: { id: merchantId },
    data: {
      merchant_status: 'DEACTIVATED',
      deactivation_reason: reason,
      deactivated_at: new Date(),
      deactivated_by: triggeredBy,
    },
  });
}
