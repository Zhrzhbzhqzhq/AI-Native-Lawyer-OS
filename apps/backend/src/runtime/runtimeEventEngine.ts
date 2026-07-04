type RuntimeEvent = {
  event_id: string
  matter_id: string
  type: string
  payload: any
  created_at: string
}

class RuntimeEventRepository {
  store: RuntimeEvent[] = []

  append(e: RuntimeEvent) {
    this.store.push(e)
    return e
  }

  list(matter_id: string) {
    return this.store.filter((s) => s.matter_id === matter_id)
  }

  latest(matter_id: string) {
    const list = this.list(matter_id)
    return list.length ? list[list.length - 1] : null
  }
}

const repo = new RuntimeEventRepository()

function genId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`
}

export class RuntimeEventEngine {
  repo: RuntimeEventRepository

  constructor() {
    this.repo = repo
  }

  emit(matter_id: string, type: string, payload: any) {
    const ev: RuntimeEvent = { event_id: genId('ev-'), matter_id, type, payload, created_at: new Date().toISOString() }
    this.repo.append(ev)
    return ev
  }

  list(matter_id: string) {
    return this.repo.list(matter_id)
  }

  latest(matter_id: string) {
    return this.repo.latest(matter_id)
  }
}

export default RuntimeEventEngine
