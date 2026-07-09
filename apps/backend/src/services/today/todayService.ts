import type { PrismaClient } from '@lawdesk/database'

type PriorityLevel = 'P1' | 'P2' | 'P3'

type TodayCompletedItem = {
    id: string
    type: 'task' | 'evidence' | 'fact' | 'issue' | 'law' | 'argument' | 'document' | 'ai_record'
    matterId: string
    matterTitle: string
    title: string
    completedAt: string
    sourceStatus: string
}

type TodayWaitingItem = {
    id: string
    type: 'task' | 'document' | 'evidence' | 'issue' | 'argument' | 'ai_record'
    matterId: string
    matterTitle: string
    title: string
    waitingReason: string
    sourceStatus: string
    updatedAt: string
}

type TodayNextActionItem = {
    id: string
    matterId: string
    matterTitle: string
    action: string
    reason: string
    priority: PriorityLevel
    etaMinutes: number
    source: 'rule_engine_v1'
}

type TodayActiveMatterItem = {
    matterId: string
    matterTitle: string
    matterStatus: string
    priority: PriorityLevel
    stageHint: string
    waitingCount: number
    nextActionCount: number
    updatedAt: string
}

export type TodayDashboardResponse = {
    generatedAt: string
    summary: {
        completedCount: number
        waitingCount: number
        nextActionsCount: number
        activeMattersCount: number
    }
    completed: TodayCompletedItem[]
    waiting: TodayWaitingItem[]
    nextActions: TodayNextActionItem[]
    activeMatters: TodayActiveMatterItem[]
    meta: {
        dataVersion: 'v1'
        partial: boolean
        warnings: string[]
    }
}

type MatterLite = {
    matter_id: string
    title: string
    status: string
    updated_at: Date
    archived_at: Date | null
    closed_at: Date | null
}

const COMPLETED_STATUS_SET = new Set(['done', 'completed', 'accepted'])
const COMPLETED_AI_STATUS_SET = new Set(['ok', 'done', 'completed'])
const WAITING_TASK_STATUS_SET = new Set(['pending', 'active', 'draft'])
const WAITING_AI_STATUS_SET = new Set(['pending', 'waiting', 'review_required'])

function isBlank(value: string | null | undefined): boolean {
    return !value || value.trim().length === 0
}

function toIsoString(value: Date | null | undefined): string {
    if (!value) return new Date(0).toISOString()
    return value.toISOString()
}

function mapPriorityLevel(score: number): PriorityLevel {
    if (score >= 7) return 'P1'
    if (score >= 4) return 'P2'
    return 'P3'
}

function priorityRank(level: PriorityLevel): number {
    if (level === 'P1') return 3
    if (level === 'P2') return 2
    return 1
}

function inTodayWindow(value: Date, startOfDay: Date, now: Date): boolean {
    return value >= startOfDay && value <= now
}

function stageHintByCounts(counts: {
    materials: number
    evidence: number
    facts: number
    issues: number
    laws: number
    arguments: number
    documents: number
}): string {
    if (counts.materials > 0 && counts.evidence === 0) return 'evidence'
    if (counts.evidence > 0 && counts.facts === 0) return 'facts'
    if (counts.facts > 0 && counts.issues === 0) return 'issues'
    if (counts.issues > 0 && counts.laws === 0) return 'laws'
    if (counts.laws > 0 && counts.arguments === 0) return 'arguments'
    if (counts.arguments > 0 && counts.documents === 0) return 'documents'
    if (counts.documents > 0) return 'review'
    return 'materials'
}

function sortByUpdatedAsc(a: TodayWaitingItem, b: TodayWaitingItem): number {
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
}

function sortByCompletedDesc(a: TodayCompletedItem, b: TodayCompletedItem): number {
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
}

function sortByNextAction(a: TodayNextActionItem, b: TodayNextActionItem): number {
    const priorityCmp = priorityRank(b.priority) - priorityRank(a.priority)
    if (priorityCmp !== 0) return priorityCmp
    return a.matterId.localeCompare(b.matterId)
}

export class TodayService {
    prisma: PrismaClient

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
    }

    async getDashboard(options?: { limit?: number }): Promise<TodayDashboardResponse> {
        const limit = Math.max(1, Math.min(100, options?.limit ?? 20))
        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)

        const warnings: string[] = []
        let partial = false

        const matters = (await this.prisma.matter.findMany({
            where: { status: 'active', archived_at: null, closed_at: null },
            select: {
                matter_id: true,
                title: true,
                status: true,
                updated_at: true,
                archived_at: true,
                closed_at: true,
            },
            orderBy: { updated_at: 'desc' },
        })) as MatterLite[]

        const filteredMatters = matters.filter((matter) => (
            matter.matter_id !== 'demo-001'
            && matter.matter_id !== 'e2e-demo-001'
            && !matter.matter_id.startsWith('demo-')
            && !matter.matter_id.startsWith('e2e-demo-')
        ))

        if (filteredMatters.length === 0) {
            warnings.push('NO_ACTIVE_MATTERS')
            return {
                generatedAt: now.toISOString(),
                summary: {
                    completedCount: 0,
                    waitingCount: 0,
                    nextActionsCount: 0,
                    activeMattersCount: 0,
                },
                completed: [],
                waiting: [],
                nextActions: [],
                activeMatters: [],
                meta: {
                    dataVersion: 'v1',
                    partial: false,
                    warnings,
                },
            }
        }

        const matterById = new Map(filteredMatters.map((matter) => [matter.matter_id, matter]))
        const matterIds = filteredMatters.map((matter) => matter.matter_id)

        const load = async <T>(source: string, loader: () => Promise<T[]>): Promise<T[]> => {
            try {
                return await loader()
            } catch (error) {
                partial = true
                warnings.push(`${source}_QUERY_FAILED`)
                return []
            }
        }

        const [
            tasks,
            materials,
            evidence,
            facts,
            issues,
            laws,
            argumentsRows,
            documents,
            aiRecords,
            workspaces,
        ] = await Promise.all([
            load('TASK', () => this.prisma.task.findMany({ where: { matter_id: { in: matterIds } }, select: { task_id: true, matter_id: true, title: true, status: true, priority: true, due_date: true, updated_at: true } })),
            load('MATERIAL', () => this.prisma.material.findMany({ where: { matter_id: { in: matterIds } }, select: { material_id: true, matter_id: true, updated_at: true } })),
            load('EVIDENCE', () => this.prisma.evidence.findMany({ where: { matter_id: { in: matterIds } }, select: { evidence_id: true, matter_id: true, title: true, status: true, description: true, relevance: true, updated_at: true } })),
            load('FACT', () => this.prisma.fact.findMany({ where: { matter_id: { in: matterIds } }, select: { fact_id: true, matter_id: true, title: true, status: true, updated_at: true } })),
            load('ISSUE', () => this.prisma.issue.findMany({ where: { matter_id: { in: matterIds } }, select: { issue_id: true, matter_id: true, title: true, status: true, updated_at: true } })),
            load('LAW', () => this.prisma.law.findMany({ where: { matter_id: { in: matterIds } }, select: { law_id: true, matter_id: true, title: true, status: true, updated_at: true } })),
            load('ARGUMENT', () => this.prisma.argument.findMany({ where: { matter_id: { in: matterIds } }, select: { argument_id: true, matter_id: true, title: true, status: true, updated_at: true } })),
            load('DOCUMENT', () => this.prisma.document.findMany({ where: { matter_id: { in: matterIds } }, select: { document_id: true, matter_id: true, title: true, status: true, content: true, updated_at: true } })),
            load('AI_RECORD', () => this.prisma.aiRecord.findMany({ where: { matter_id: { in: matterIds } }, select: { ai_record_id: true, matter_id: true, ai_task_type: true, status: true, updated_at: true } })),
            load('WORKSPACE', () => this.prisma.workspace.findMany({ where: { matter_id: { in: matterIds } }, select: { workspace_id: true, matter_id: true, updated_at: true } })),
        ])

        const groupByMatter = <T extends { matter_id: string }>(rows: T[]): Map<string, T[]> => {
            const grouped = new Map<string, T[]>()
            for (const row of rows) {
                const list = grouped.get(row.matter_id)
                if (list) {
                    list.push(row)
                } else {
                    grouped.set(row.matter_id, [row])
                }
            }
            return grouped
        }

        const tasksByMatter = groupByMatter(tasks)
        const materialsByMatter = groupByMatter(materials)
        const evidenceByMatter = groupByMatter(evidence)
        const factsByMatter = groupByMatter(facts)
        const issuesByMatter = groupByMatter(issues)
        const lawsByMatter = groupByMatter(laws)
        const argumentsByMatter = groupByMatter(argumentsRows)
        const documentsByMatter = groupByMatter(documents)
        const aiRecordsByMatter = groupByMatter(aiRecords)
        const workspacesByMatter = groupByMatter(workspaces)

        const completed: TodayCompletedItem[] = []
        const waiting: TodayWaitingItem[] = []
        const nextActions: TodayNextActionItem[] = []
        const activeMatters: Array<TodayActiveMatterItem & { _score: number; _overdueTaskCount: number }> = []

        for (const matter of filteredMatters) {
            const matterId = matter.matter_id
            const matterTitle = matter.title
            const matterTasks = tasksByMatter.get(matterId) ?? []
            const matterMaterials = materialsByMatter.get(matterId) ?? []
            const matterEvidence = evidenceByMatter.get(matterId) ?? []
            const matterFacts = factsByMatter.get(matterId) ?? []
            const matterIssues = issuesByMatter.get(matterId) ?? []
            const matterLaws = lawsByMatter.get(matterId) ?? []
            const matterArguments = argumentsByMatter.get(matterId) ?? []
            const matterDocuments = documentsByMatter.get(matterId) ?? []
            const matterAiRecords = aiRecordsByMatter.get(matterId) ?? []
            const matterWorkspaces = workspacesByMatter.get(matterId) ?? []

            for (const row of matterTasks) {
                if (COMPLETED_STATUS_SET.has(row.status) && inTodayWindow(row.updated_at, startOfDay, now)) {
                    completed.push({
                        id: row.task_id,
                        type: 'task',
                        matterId,
                        matterTitle,
                        title: row.title,
                        completedAt: row.updated_at.toISOString(),
                        sourceStatus: row.status,
                    })
                }

                if (WAITING_TASK_STATUS_SET.has(row.status)) {
                    waiting.push({
                        id: row.task_id,
                        type: 'task',
                        matterId,
                        matterTitle,
                        title: row.title,
                        waitingReason: '待律师执行任务',
                        sourceStatus: row.status,
                        updatedAt: row.updated_at.toISOString(),
                    })
                }
            }

            for (const row of matterDocuments) {
                if (COMPLETED_STATUS_SET.has(row.status) && inTodayWindow(row.updated_at, startOfDay, now)) {
                    completed.push({
                        id: row.document_id,
                        type: 'document',
                        matterId,
                        matterTitle,
                        title: row.title,
                        completedAt: row.updated_at.toISOString(),
                        sourceStatus: row.status,
                    })
                }

                if (row.status === 'draft' && isBlank(row.content)) {
                    waiting.push({
                        id: row.document_id,
                        type: 'document',
                        matterId,
                        matterTitle,
                        title: row.title,
                        waitingReason: '待律师补全文书内容',
                        sourceStatus: row.status,
                        updatedAt: row.updated_at.toISOString(),
                    })
                }
            }

            for (const row of matterEvidence) {
                const hasWeakSignal = row.status === 'weak' || row.status === 'pending' || isBlank(row.description) || isBlank(row.relevance)

                if (row.status === 'accepted' && inTodayWindow(row.updated_at, startOfDay, now)) {
                    completed.push({
                        id: row.evidence_id,
                        type: 'evidence',
                        matterId,
                        matterTitle,
                        title: row.title,
                        completedAt: row.updated_at.toISOString(),
                        sourceStatus: row.status,
                    })
                }

                if (hasWeakSignal) {
                    waiting.push({
                        id: row.evidence_id,
                        type: 'evidence',
                        matterId,
                        matterTitle,
                        title: row.title,
                        waitingReason: '待律师补强证据说明/关联',
                        sourceStatus: row.status,
                        updatedAt: row.updated_at.toISOString(),
                    })
                }
            }

            for (const row of matterFacts) {
                if (COMPLETED_STATUS_SET.has(row.status) && inTodayWindow(row.updated_at, startOfDay, now)) {
                    completed.push({
                        id: row.fact_id,
                        type: 'fact',
                        matterId,
                        matterTitle,
                        title: row.title,
                        completedAt: row.updated_at.toISOString(),
                        sourceStatus: row.status,
                    })
                }
            }

            for (const row of matterIssues) {
                if (COMPLETED_STATUS_SET.has(row.status) && inTodayWindow(row.updated_at, startOfDay, now)) {
                    completed.push({
                        id: row.issue_id,
                        type: 'issue',
                        matterId,
                        matterTitle,
                        title: row.title,
                        completedAt: row.updated_at.toISOString(),
                        sourceStatus: row.status,
                    })
                }

                if (row.status === 'draft') {
                    waiting.push({
                        id: row.issue_id,
                        type: 'issue',
                        matterId,
                        matterTitle,
                        title: row.title,
                        waitingReason: '待律师确认争议焦点',
                        sourceStatus: row.status,
                        updatedAt: row.updated_at.toISOString(),
                    })
                }
            }

            for (const row of matterLaws) {
                if (COMPLETED_STATUS_SET.has(row.status) && inTodayWindow(row.updated_at, startOfDay, now)) {
                    completed.push({
                        id: row.law_id,
                        type: 'law',
                        matterId,
                        matterTitle,
                        title: row.title,
                        completedAt: row.updated_at.toISOString(),
                        sourceStatus: row.status,
                    })
                }
            }

            for (const row of matterArguments) {
                if (COMPLETED_STATUS_SET.has(row.status) && inTodayWindow(row.updated_at, startOfDay, now)) {
                    completed.push({
                        id: row.argument_id,
                        type: 'argument',
                        matterId,
                        matterTitle,
                        title: row.title,
                        completedAt: row.updated_at.toISOString(),
                        sourceStatus: row.status,
                    })
                }

                if (row.status === 'draft') {
                    waiting.push({
                        id: row.argument_id,
                        type: 'argument',
                        matterId,
                        matterTitle,
                        title: row.title,
                        waitingReason: '待律师确认法律论证草稿',
                        sourceStatus: row.status,
                        updatedAt: row.updated_at.toISOString(),
                    })
                }
            }

            for (const row of matterAiRecords) {
                if (COMPLETED_AI_STATUS_SET.has(row.status) && inTodayWindow(row.updated_at, startOfDay, now)) {
                    completed.push({
                        id: row.ai_record_id,
                        type: 'ai_record',
                        matterId,
                        matterTitle,
                        title: row.ai_task_type,
                        completedAt: row.updated_at.toISOString(),
                        sourceStatus: row.status,
                    })
                }

                if (WAITING_AI_STATUS_SET.has(row.status)) {
                    waiting.push({
                        id: row.ai_record_id,
                        type: 'ai_record',
                        matterId,
                        matterTitle,
                        title: row.ai_task_type,
                        waitingReason: '待律师确认AI结果',
                        sourceStatus: row.status,
                        updatedAt: row.updated_at.toISOString(),
                    })
                }
            }

            const overdueTaskCount = matterTasks.filter((row) => (
                !!row.due_date
                && row.due_date < now
                && !COMPLETED_STATUS_SET.has(row.status)
            )).length

            const emptyDraftDocumentCount = matterDocuments.filter((row) => row.status === 'draft' && isBlank(row.content)).length
            const weakEvidenceCount = matterEvidence.filter((row) => (
                row.status === 'weak'
                || row.status === 'pending'
                || isBlank(row.description)
                || isBlank(row.relevance)
            )).length

            const thisMatterWaitingCount = waiting.filter((row) => row.matterId === matterId).length

            const actionCandidates: TodayNextActionItem[] = []
            const counts = {
                materials: matterMaterials.length,
                evidence: matterEvidence.length,
                facts: matterFacts.length,
                issues: matterIssues.length,
                laws: matterLaws.length,
                arguments: matterArguments.length,
                documents: matterDocuments.length,
            }

            const pushAction = (action: string, reason: string, priority: PriorityLevel, etaMinutes: number): void => {
                actionCandidates.push({
                    id: `na-${matterId}-${actionCandidates.length + 1}`,
                    matterId,
                    matterTitle,
                    action,
                    reason,
                    priority,
                    etaMinutes,
                    source: 'rule_engine_v1',
                })
            }

            if (counts.materials > 0 && counts.evidence === 0) pushAction('生成证据草稿', '材料已存在但证据为空', 'P2', 25)
            if (counts.evidence > 0 && counts.facts === 0) pushAction('生成事实清单', '证据已存在但事实为空', 'P2', 20)
            if (counts.facts > 0 && counts.issues === 0) pushAction('识别争议焦点', '事实已存在但焦点为空', 'P2', 20)
            if (counts.issues > 0 && counts.laws === 0) pushAction('推荐相关法条', '争议焦点已存在但法条为空', 'P2', 15)
            if (counts.laws > 0 && counts.arguments === 0) pushAction('生成法律论证', '法条已存在但论证为空', 'P2', 25)
            if (counts.arguments > 0 && counts.documents === 0) pushAction('起草文书', '论证已存在但文书为空', 'P2', 35)
            if (emptyDraftDocumentCount > 0) pushAction('完善文书草稿内容', '存在空内容文书草稿', 'P1', 30)
            if (overdueTaskCount > 0) pushAction('优先处理逾期任务', '存在逾期任务', 'P1', 20)

            const uniqueActions = new Map<string, TodayNextActionItem>()
            for (const action of actionCandidates) {
                const key = `${action.matterId}:${action.action}`
                if (!uniqueActions.has(key)) uniqueActions.set(key, action)
            }
            const thisMatterActions = Array.from(uniqueActions.values()).slice(0, 3)
            nextActions.push(...thisMatterActions)

            let score = 0
            if (overdueTaskCount > 0) score += 4
            if (thisMatterWaitingCount >= 3) score += 3
            if (emptyDraftDocumentCount > 0) score += 2
            if (weakEvidenceCount > 0) score += 2

            const latestUpdatedAtMs = Math.max(
                matter.updated_at.getTime(),
                ...matterTasks.map((row) => row.updated_at.getTime()),
                ...matterMaterials.map((row) => row.updated_at.getTime()),
                ...matterEvidence.map((row) => row.updated_at.getTime()),
                ...matterFacts.map((row) => row.updated_at.getTime()),
                ...matterIssues.map((row) => row.updated_at.getTime()),
                ...matterLaws.map((row) => row.updated_at.getTime()),
                ...matterArguments.map((row) => row.updated_at.getTime()),
                ...matterDocuments.map((row) => row.updated_at.getTime()),
                ...matterAiRecords.map((row) => row.updated_at.getTime()),
                ...matterWorkspaces.map((row) => row.updated_at.getTime()),
            )

            const latestUpdatedAt = new Date(latestUpdatedAtMs)
            const isStalled = latestUpdatedAt < staleThreshold && (thisMatterWaitingCount > 0 || thisMatterActions.length > 0)
            if (isStalled) score += 1
            if (thisMatterActions.length > 0) score += 1

            const level = mapPriorityLevel(score)
            const hasRecentUpdate = latestUpdatedAt >= staleThreshold
            const shouldIncludeActiveMatter = thisMatterWaitingCount > 0 || thisMatterActions.length > 0 || hasRecentUpdate

            if (shouldIncludeActiveMatter) {
                activeMatters.push({
                    matterId,
                    matterTitle,
                    matterStatus: matter.status,
                    priority: level,
                    stageHint: stageHintByCounts(counts),
                    waitingCount: thisMatterWaitingCount,
                    nextActionCount: thisMatterActions.length,
                    updatedAt: latestUpdatedAt.toISOString(),
                    _score: score,
                    _overdueTaskCount: overdueTaskCount,
                })
            }
        }

        const dedupCompleted = new Map<string, TodayCompletedItem>()
        for (const row of completed) {
            const key = `${row.type}:${row.id}`
            if (!dedupCompleted.has(key)) dedupCompleted.set(key, row)
        }

        const sortedCompleted = Array.from(dedupCompleted.values()).sort(sortByCompletedDesc)
        const sortedWaiting = waiting.sort(sortByUpdatedAsc)
        const sortedNextActions = nextActions.sort(sortByNextAction).slice(0, 20)
        const sortedActiveMatters = activeMatters
            .sort((a, b) => {
                const levelCmp = priorityRank(b.priority) - priorityRank(a.priority)
                if (levelCmp !== 0) return levelCmp
                if (b._score !== a._score) return b._score - a._score
                if (b._overdueTaskCount !== a._overdueTaskCount) return b._overdueTaskCount - a._overdueTaskCount
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            })
            .slice(0, limit)
            .map(({ _score, _overdueTaskCount, ...row }) => row)

        const response: TodayDashboardResponse = {
            generatedAt: now.toISOString(),
            summary: {
                completedCount: sortedCompleted.length,
                waitingCount: sortedWaiting.length,
                nextActionsCount: sortedNextActions.length,
                activeMattersCount: sortedActiveMatters.length,
            },
            completed: sortedCompleted,
            waiting: sortedWaiting,
            nextActions: sortedNextActions,
            activeMatters: sortedActiveMatters,
            meta: {
                dataVersion: 'v1',
                partial,
                warnings,
            },
        }

        if (!matterIds.some((matterId) => matterById.has(matterId))) {
            response.meta.warnings.push('NO_ACTIVE_MATTERS')
        }

        if (
            response.completed.length === 0
            && response.waiting.length === 0
            && response.nextActions.length === 0
            && response.activeMatters.length === 0
            && !response.meta.warnings.includes('NO_ACTIVE_MATTERS')
        ) {
            response.meta.warnings.push('NO_ACTIVE_MATTERS')
        }

        response.meta.warnings = Array.from(new Set(response.meta.warnings))

        return response
    }
}

export default TodayService