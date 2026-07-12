export type MatterContext = {
    matter: any | null
    client: any | null
    materials: any[]
    evidence: any[]
    research: any[]
    documents: any[]
    caseFacts?: {
        plaintiff: string | null
        defendant: string | null
        causeOfAction: string | null
        amount: string | null
        keyDates: string[]
        claims: string[]
        evidenceTitles: string[]
    }
}

export default MatterContext
