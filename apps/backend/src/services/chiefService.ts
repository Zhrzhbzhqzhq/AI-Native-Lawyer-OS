import type { PrismaClient } from '@lawdesk/database'
import MatterRepository from '../repositories/matterRepository'
import TaskRepository from '../repositories/taskRepository'

type TodayRuntime = {
    review: any[]
    ready: any[]
    handle: any[]
    completed: any[]
    risks: any[]
}

type EnrichedTask = { nextAction?: string; reason?: string } & Record<string, any>

export class ChiefService {
    matterRepo: MatterRepository
    taskRepo: TaskRepository

    constructor(prisma: PrismaClient) {
        this.matterRepo = new MatterRepository(prisma)
        this.taskRepo = new TaskRepository(prisma)
    }

    // Public API
    async generateTodayRuntime(): Promise<TodayRuntime> {
        const tasks = await this.collectTasks()
        const filtered = this.filter(tasks)
        const grouped = this.group(filtered)
        const sorted = this.sort(grouped)

        // Enrich tasks with nextAction and reason (V1 mapping by status)
        const enrich = (items: any[] = []) => (items || []).map((it: any) => ({ ...(it || {}), ...this.mapActionForStatus(it?.status) })) as EnrichedTask[]

        // V1 fixed ordering when returning object
        const runtime: TodayRuntime = {
            risks: enrich(sorted.risks || []),
            review: enrich(sorted.review || []),
            ready: enrich(sorted.ready || []),
            handle: enrich(sorted.handle || []),
            completed: enrich(sorted.completed || []),
        }

        return runtime
    }

    // Map task.status -> nextAction and reason
    mapActionForStatus(status?: string) {
        const s = (status || '').toLowerCase()
        switch (s) {
            case 'waiting_lawyer':
                return { nextAction: '审核工作成果', reason: 'AI 已完成本轮工作，等待律师审核' }
            case 'ready_to_start':
                return { nextAction: '同意开始', reason: '资料已具备，可以开始处理' }
            case 'waiting_materials':
                return { nextAction: '补充资料', reason: '当前资料不足，暂时无法继续' }
            case 'revision_requested':
                return { nextAction: '等待 AI 修正', reason: '律师已提出修改意见' }
            case 'ai_working':
                return { nextAction: '查看处理进度', reason: 'AI 正在处理中' }
            case 'ai_revising':
                return { nextAction: '查看修正进度', reason: 'AI 正在根据律师意见修正' }
            case 'approved':
                return { nextAction: '确认定稿', reason: '律师已审核通过，等待最终定稿' }
            case 'finalized':
            case 'completed':
                return { nextAction: '查看成果', reason: '该项工作已完成' }
            default:
                return { nextAction: '进入案件', reason: '查看当前工作状态' }
        }
    }

    // collect tasks across matters
    async collectTasks() {
        const matters = await this.matterRepo.findAll()
        const all: any[] = []
        for (const m of matters || []) {
            const tasks = await this.taskRepo.findByMatterId(m.matter_id)
            for (const t of tasks || []) {
                all.push({ ...t, matter: m })
            }
        }
        return all
    }

    // simple filter: exclude tasks without status
    filter(tasks: any[]) {
        return (tasks || []).filter(t => t && t.status)
    }

    // group into buckets
    group(tasks: any[]) {
        const out: Record<string, any[]> = { risks: [], review: [], ready: [], handle: [], completed: [] }
        for (const t of tasks) {
            const s = (t.status || '').toLowerCase()
            const p = (t.priority || '').toLowerCase()

            if (p === 'high' || s === 'blocked' || s === 'overdue') {
                out.risks.push(t)
                continue
            }

            if (s === 'waiting_review' || s === 'ready_for_review' || s === 'review') {
                out.review.push(t)
                continue
            }

            if (s === 'ready_to_start' || s === 'open') {
                out.ready.push(t)
                continue
            }

            if (s === 'completed' || s === 'finalized') {
                out.completed.push(t)
                continue
            }

            // default to handle
            out.handle.push(t)
        }
        return out
    }

    // sort within buckets: risks -> priority, then due_date; others by due_date
    sort(grouped: Record<string, any[]>) {
        const byDue = (a: any, b: any) => {
            const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
            const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
            return da - db
        }

        const byPriority = (a: any, b: any) => {
            const order: Record<string, number> = { high: 0, normal: 1, low: 2 }
            const pa = order[(a.priority || 'normal').toLowerCase()] ?? 1
            const pb = order[(b.priority || 'normal').toLowerCase()] ?? 1
            if (pa !== pb) return pa - pb
            return byDue(a, b)
        }

        return {
            risks: (grouped.risks || []).sort(byPriority),
            review: (grouped.review || []).sort(byDue),
            ready: (grouped.ready || []).sort(byDue),
            handle: (grouped.handle || []).sort(byDue),
            completed: (grouped.completed || []).sort(byDue),
        }
    }
}

export default ChiefService
