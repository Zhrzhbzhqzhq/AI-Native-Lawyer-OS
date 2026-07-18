const MATTER_ID = 'm-mrops93o-2ttp0a'

async function main() {
  if (!process.env.DATABASE_URL?.startsWith('file:')) {
    throw new Error('desktop_sqlite_database_url_required')
  }

  const { PrismaClient } = await import('../packages/database/generated/desktop-client')
  const prisma = new PrismaClient()

  try {
    const issues = await prisma.issue.findMany({
      where: { matter_id: MATTER_ID },
      orderBy: [{ created_at: 'asc' }, { issue_id: 'asc' }],
    })
    const byTitle = new Map<string, typeof issues>()
    for (const issue of issues) {
      const rows = byTitle.get(issue.title) || []
      rows.push(issue)
      byTitle.set(issue.title, rows)
    }

    const duplicateGroups = Array.from(byTitle.values()).filter((rows) => rows.length > 1)
    const keptIssueIds = duplicateGroups.map((rows) => rows[0].issue_id)
    const duplicateIssueIds = duplicateGroups.flatMap((rows) => rows.slice(1).map((issue) => issue.issue_id))

    const result = await prisma.$transaction(async (tx) => {
      if (duplicateIssueIds.length === 0) {
        return { deletedIssues: 0, deletedIssueFacts: 0 }
      }

      const [lawLinks, argumentLinks, documentLinks, directLaws] = await Promise.all([
        tx.lawIssue.count({ where: { issue_id: { in: duplicateIssueIds } } }),
        tx.argumentIssue.count({ where: { issue_id: { in: duplicateIssueIds } } }),
        tx.documentIssue.count({ where: { issue_id: { in: duplicateIssueIds } } }),
        tx.law.count({ where: { issue_id: { in: duplicateIssueIds } } }),
      ])
      if (lawLinks > 0 || argumentLinks > 0 || documentLinks > 0 || directLaws > 0) {
        throw new Error('duplicate_issue_has_downstream_relations')
      }

      const deletedIssueFacts = await tx.issueFact.deleteMany({
        where: { issue_id: { in: duplicateIssueIds } },
      })
      const deletedIssues = await tx.issue.deleteMany({
        where: { matter_id: MATTER_ID, issue_id: { in: duplicateIssueIds } },
      })
      return {
        deletedIssues: deletedIssues.count,
        deletedIssueFacts: deletedIssueFacts.count,
      }
    })

    console.log('[ISSUE DUPLICATE CLEANUP]', {
      matter_id: MATTER_ID,
      deleted_issue_count: result.deletedIssues,
      deleted_issue_fact_count: result.deletedIssueFacts,
      kept_issue_ids: keptIssueIds,
    })
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
