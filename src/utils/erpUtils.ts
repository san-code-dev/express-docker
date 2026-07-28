import { TransactionSchema } from "../interface/base.interface";
import prisma from "../lib/prisma";

export const generateNewInvoiceNumber = async (SCHEMA: TransactionSchema): Promise<string> => {
  const prismaModel = (prisma as any)[SCHEMA.key];
  const today = new Date();
  const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

  const lastInvoice = await prismaModel.findFirst({
    where: { noInvoice: { startsWith: `${SCHEMA.prefix}-${yearMonth}` } },
    orderBy: { id: 'desc' }
  });

  let currentIncrement = 1;
  if (lastInvoice) {
    const lastInvoiceNum = lastInvoice.noInvoice.split('-')[2];
    currentIncrement = parseInt(lastInvoiceNum, 10) + 1;
  }

  return `${SCHEMA.prefix}-${yearMonth}-${String(currentIncrement).padStart(4, '0')}`;
}