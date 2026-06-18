import { prisma } from '@/lib/db'

/**
 * FA-F-31: Enforces the project's review workflow before export or posting.
 *
 * SIMPLE mode: always allowed (internal-only review, no customer approval required).
 * COMPLETE mode:
 *   - contentIndex provided → that specific item must have ContentApproval.status = 'freigegeben'
 *   - no contentIndex (bulk export) → at least one item must be freigegeben
 */
export async function checkReviewGate(
  projectId: string,
  contentIndex?: number,
): Promise<{ blocked: boolean; reason?: string }> {
  const project = await prisma.project.findUnique({
    where:  { id: projectId },
    select: { reviewMode: true },
  })

  if (!project || project.reviewMode === 'SIMPLE') {
    return { blocked: false }
  }

  if (contentIndex !== undefined) {
    const approval = await prisma.contentApproval.findUnique({
      where:  { projectId_contentIndex: { projectId, contentIndex } },
      select: { status: true },
    })
    if (!approval || approval.status !== 'freigegeben') {
      return { blocked: true, reason: 'review_not_freigegeben' }
    }
  } else {
    const count = await prisma.contentApproval.count({
      where: { projectId, status: 'freigegeben' },
    })
    if (count === 0) {
      return { blocked: true, reason: 'review_not_freigegeben' }
    }
  }

  return { blocked: false }
}
