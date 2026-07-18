const MATTER_ID = 'm-mrops93o-2ttp0a'
const LAW_ID = 'law-mrp4so38-8l4f7m'

async function main() {
  if (!process.env.DATABASE_URL?.startsWith('file:')) {
    throw new Error('desktop_sqlite_database_url_required')
  }

  const { PrismaClient } = await import('../packages/database/generated/desktop-client')
  const prisma = new PrismaClient()

  try {
    const law = await prisma.law.findUnique({ where: { law_id: LAW_ID } })
    if (!law || law.matter_id !== MATTER_ID) throw new Error('target_law_not_found')
    if (!law.issue_id) throw new Error('target_law_issue_id_missing')

    const issue = await prisma.issue.findUnique({ where: { issue_id: law.issue_id } })
    if (!issue || issue.matter_id !== MATTER_ID) throw new Error('target_issue_not_found')

    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.lawIssue.deleteMany({ where: { law_id: LAW_ID } })
      await tx.lawIssue.create({
        data: {
          law_id: LAW_ID,
          issue_id: issue.issue_id,
        },
      })
      return { deleted: deleted.count, created: 1 }
    })

    console.log(JSON.stringify({
      matter_id: MATTER_ID,
      law_id: LAW_ID,
      issue_id: issue.issue_id,
      issue_title: issue.title,
      deleted_links: result.deleted,
      created_links: result.created,
    }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
