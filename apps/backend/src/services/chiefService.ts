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

        // V1 fixed ordering when returning object
        const runtime: TodayRuntime = {
            risks: sorted.risks || [],
            review: sorted.review || [],
            ready: sorted.ready || [],
            handle: sorted.handle || [],
            completed: sorted.completed || [],
        }

        return runtime
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
