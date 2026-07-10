export const INTAKE = 'INTAKE'
export const EVIDENCE = 'EVIDENCE'
export const RESEARCH = 'RESEARCH'
export const DOCUMENTS = 'DOCUMENTS'
export const LITIGATION = 'LITIGATION'
export const EXECUTION = 'EXECUTION'
export const CLOSING = 'CLOSING'
export const CLOSED = 'CLOSED'

export type MatterStage =
    | typeof INTAKE
    | typeof EVIDENCE
    | typeof RESEARCH
    | typeof DOCUMENTS
    | typeof LITIGATION
    | typeof EXECUTION
    | typeof CLOSING
    | typeof CLOSED

export default {
    INTAKE,
    EVIDENCE,
    RESEARCH,
    DOCUMENTS,
    LITIGATION,
    EXECUTION,
    CLOSING,
    CLOSED,
}
