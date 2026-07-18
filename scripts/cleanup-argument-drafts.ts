const MATTER_ID = 'm-mrops93o-2ttp0a'

async function main() {
  if (!process.env.DATABASE_URL?.startsWith('file:')) {
    throw new Error('desktop_sqlite_database_url_required')
  }

  const { PrismaClient } = await import('../packages/database/generated/desktop-client')
  const prisma = new PrismaClient()

  try {
    const issueIds = (await prisma.issue.findMany({
      where: { matter_id: MATTER_ID },
      select: { issue_id: true },
    })).map((issue) => issue.issue_id)
    const before = {
      arguments: await prisma.argument.count({ where: { matter_id: MATTER_ID } }),
      issues: issueIds.length,
      issueFacts: await prisma.issueFact.count({ where: { issue_id: { in: issueIds } } }),
      facts: await prisma.fact.count({ where: { matter_id: MATTER_ID } }),
    }

    const deleted = await prisma.$transaction(async (tx) => (
      tx.argumentDraft.deleteMany({ where: { matter_id: MATTER_ID } })
    ))

    const after = {
      arguments: await prisma.argument.count({ where: { matter_id: MATTER_ID } }),
      issues: await prisma.issue.count({ where: { matter_id: MATTER_ID } }),
      issueFacts: await prisma.issueFact.count({ where: { issue_id: { in: issueIds } } }),
      facts: await prisma.fact.count({ where: { matter_id: MATTER_ID } }),
    }
    if (JSON.stringify(after) !== JSON.stringify(before)) {
      throw new Error('non_argument_draft_data_changed')
    }

    console.log('[ARGUMENT DRAFT CLEANUP]', {
      matter_id: MATTER_ID,
      deleted_count: deleted.count,
    })
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
