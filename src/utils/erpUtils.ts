export const generateNewInvoiceNumber = async (transaction: any,prefix: string): Promise<string> => {
  const today = new Date();
  const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

  const lastInvoice = await transaction.findFirst({
    where: { noInvoice: { startsWith: `${prefix}-${yearMonth}` } },
    orderBy: { id: 'desc' }
  });

  let currentIncrement = 1;
  if (lastInvoice) {
    const lastInvoiceNum = lastInvoice.noInvoice.split('-')[2];
    currentIncrement = parseInt(lastInvoiceNum, 10) + 1;
  }

  return `${prefix}-${yearMonth}-${String(currentIncrement).padStart(4, '0')}`;
}