import { prisma } from './prisma.js'

export async function recomputeAlternativeTotal(quoteAlternativeId: string) {
  const agg = await prisma.quoteLineItem.aggregate({
    where: { quoteAlternativeId },
    _sum: { total: true },
  })
  const total = agg._sum.total ?? 0
  await prisma.quoteAlternative.update({
    where: { id: quoteAlternativeId },
    data: { totalPrice: total },
  })
  return total
}
