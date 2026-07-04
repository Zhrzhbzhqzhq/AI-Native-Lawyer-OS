import type { ActionProposal } from '../models/actionProposal'

const STORAGE: Record<string, ActionProposal> = {}

function genId() {
  return `ap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
}

export class ActionProposalRepository {
  async listByMatter(matter_id: string) {
    return Object.values(STORAGE).filter((s) => s.matter_id === matter_id)
  }

  async getById(proposal_id: string) {
    return STORAGE[proposal_id] ?? null
  }

  async createMany(proposals: Omit<ActionProposal, 'proposal_id' | 'created_at' | 'decided_at'>[]) {
    const created: ActionProposal[] = []
    for (const p of proposals) {
      // Deduplicate: same matter_id + action + title cannot have multiple pending
      const duplicate = Object.values(STORAGE).find((s) => s.matter_id === p.matter_id && s.action === p.action && s.title === p.title && s.status === 'pending')
      if (duplicate) {
        created.push(duplicate)
        continue
      }

      const id = genId()
      const now = new Date().toISOString()
      const rec: ActionProposal = { ...p, proposal_id: id, created_at: now, decided_at: null, updated_at: now }
      STORAGE[id] = rec
      created.push(rec)
    }
    return created
  }

  async updateStatus(proposal_id: string, status: 'approved' | 'rejected') {
    const existing = STORAGE[proposal_id]
    if (!existing) throw new Error('not found')
    const decided_at = new Date().toISOString()
    const updated = { ...existing, status, decided_at, updated_at: decided_at }
    STORAGE[proposal_id] = updated as ActionProposal
    return updated
  }

  async markExecuted(proposal_id: string) {
    const existing = STORAGE[proposal_id]
    if (!existing) throw new Error('not found')
    return this.setStatus(proposal_id, 'executed')
  }

  async setStatus(proposal_id: string, status: ActionProposal['status']) {
    const existing = STORAGE[proposal_id]
    if (!existing) throw new Error('not found')
    const decided_at = new Date().toISOString()
    const updated = { ...existing, status, decided_at }
    STORAGE[proposal_id] = updated as ActionProposal
    return updated
  }
}

export default ActionProposalRepository
