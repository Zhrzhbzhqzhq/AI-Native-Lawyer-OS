const MATTER_ID = 'm-mrops93o-2ttp0a'
const ISSUE_ID = 'iss-mrov2l16-xdtx3p'
const FACT_IDS = [
  'fct-mrot47d5-3s59vl',
  'fct-mrot47cx-eh4cws',
  'fct-mrot47cu-bf9l2u',
  'fct-mrot47cm-gzjtq3',
]

async function main() {
  if (!process.env.DATABASE_URL?.startsWith('file:')) {
    throw new Error('desktop_sqlite_database_url_required')
  }

  const { PrismaClient } = await import('../packages/database/generated/desktop-client')
  const prisma = new PrismaClient()

  try {
    const [issue, facts, beforeLinks] = await Promise.all([
      prisma.issue.findUnique({ where: { issue_id: ISSUE_ID } }),
      prisma.fact.findMany({ where: { fact_id: { in: FACT_IDS } } }),
      prisma.issueFact.findMany({ where: { issue_id: ISSUE_ID }, orderBy: { fact_id: 'asc' } }),
    ])

    if (!issue || issue.matter_id !== MATTER_ID) throw new Error('target_issue_not_found')
    if (facts.length !== FACT_IDS.length || facts.some((fact) => fact.matter_id !== MATTER_ID)) {
      throw new Error('target_facts_not_found')
    }

    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.issueFact.deleteMany({ where: { issue_id: ISSUE_ID } })
      for (const factId of FACT_IDS) {
        await tx.issueFact.create({
          data: {
            issue_id: ISSUE_ID,
            fact_id: factId,
            note: 'one_time_statute_limit_fix',
          },
        })
      }
      return { deleted: deleted.count, created: FACT_IDS.length }
    })

    const afterLinks = await prisma.issueFact.findMany({
      where: { issue_id: ISSUE_ID },
      orderBy: { fact_id: 'asc' },
    })
    const expected = [...FACT_IDS].sort()
    const actual = afterLinks.map((link) => link.fact_id).sort()
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error('issue_fact_post_validation_failed')
    }

    console.log('[ISSUE FACT STATUTE LIMIT FIX]', {
      matter_id: MATTER_ID,
      issue_id: ISSUE_ID,
      before_fact_ids: beforeLinks.map((link) => link.fact_id),
      after_fact_ids: actual,
      deleted_count: result.deleted,
      created_count: result.created,
    })
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
