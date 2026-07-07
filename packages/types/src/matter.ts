export interface Matter {
    // primary identifiers
    id: string
    matter_id?: string
    matter_no?: string

    // basic metadata (snake_case to match backend APIs)
    title?: string
    client_id?: string
    status?: string
    created_at?: string
    updated_at?: string

    // allow additional fields from backend without strict typing
    [key: string]: unknown
}
