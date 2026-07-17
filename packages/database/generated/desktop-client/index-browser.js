
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.MatterScalarFieldEnum = {
  id: 'id',
  matter_id: 'matter_id',
  title: 'title',
  description: 'description',
  matter_type: 'matter_type',
  status: 'status',
  stage: 'stage',
  created_at: 'created_at',
  updated_at: 'updated_at',
  closed_at: 'closed_at',
  archived_at: 'archived_at'
};

exports.Prisma.ClientScalarFieldEnum = {
  id: 'id',
  client_id: 'client_id',
  matter_id: 'matter_id',
  name: 'name',
  client_type: 'client_type',
  contact_info: 'contact_info',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.MaterialScalarFieldEnum = {
  id: 'id',
  material_id: 'material_id',
  matter_id: 'matter_id',
  title: 'title',
  material_type: 'material_type',
  source: 'source',
  storage_uri: 'storage_uri',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.EvidenceScalarFieldEnum = {
  id: 'id',
  evidence_id: 'evidence_id',
  matter_id: 'matter_id',
  material_id: 'material_id',
  title: 'title',
  evidence_type: 'evidence_type',
  description: 'description',
  relevance: 'relevance',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.DocumentScalarFieldEnum = {
  id: 'id',
  document_id: 'document_id',
  matter_id: 'matter_id',
  material_id: 'material_id',
  evidence_id: 'evidence_id',
  argument_id: 'argument_id',
  title: 'title',
  document_type: 'document_type',
  version: 'version',
  content_uri: 'content_uri',
  content: 'content',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.DocumentDraftScalarFieldEnum = {
  id: 'id',
  matter_id: 'matter_id',
  document_type: 'document_type',
  title: 'title',
  content: 'content',
  source_argument_ids: 'source_argument_ids',
  source_fact_ids: 'source_fact_ids',
  source_issue_ids: 'source_issue_ids',
  source_law_ids: 'source_law_ids',
  confidence: 'confidence',
  ai_reasoning: 'ai_reasoning',
  review_status: 'review_status',
  lawyer_note: 'lawyer_note',
  published_document_id: 'published_document_id',
  published_at: 'published_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  task_id: 'task_id',
  matter_id: 'matter_id',
  client_id: 'client_id',
  material_id: 'material_id',
  evidence_id: 'evidence_id',
  document_id: 'document_id',
  title: 'title',
  description: 'description',
  priority: 'priority',
  due_date: 'due_date',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.TimelineScalarFieldEnum = {
  id: 'id',
  timeline_id: 'timeline_id',
  matter_id: 'matter_id',
  task_id: 'task_id',
  document_id: 'document_id',
  material_id: 'material_id',
  evidence_id: 'evidence_id',
  ai_record_id: 'ai_record_id',
  event_type: 'event_type',
  event_time: 'event_time',
  description: 'description',
  source: 'source',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.WorkflowEventScalarFieldEnum = {
  id: 'id',
  workflow_event_id: 'workflow_event_id',
  matter_id: 'matter_id',
  workflow_id: 'workflow_id',
  timeline_id: 'timeline_id',
  task_id: 'task_id',
  document_id: 'document_id',
  evidence_id: 'evidence_id',
  ai_record_id: 'ai_record_id',
  event_type: 'event_type',
  event_time: 'event_time',
  source: 'source',
  payload: 'payload',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.AiRecordScalarFieldEnum = {
  id: 'id',
  ai_record_id: 'ai_record_id',
  matter_id: 'matter_id',
  task_id: 'task_id',
  timeline_id: 'timeline_id',
  document_id: 'document_id',
  material_id: 'material_id',
  evidence_id: 'evidence_id',
  workflow_event_id: 'workflow_event_id',
  knowledge_id: 'knowledge_id',
  ai_task_type: 'ai_task_type',
  model: 'model',
  prompt_uri: 'prompt_uri',
  result_uri: 'result_uri',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.KnowledgeScalarFieldEnum = {
  id: 'id',
  knowledge_id: 'knowledge_id',
  matter_id: 'matter_id',
  document_id: 'document_id',
  material_id: 'material_id',
  evidence_id: 'evidence_id',
  task_id: 'task_id',
  timeline_id: 'timeline_id',
  workflow_event_id: 'workflow_event_id',
  ai_record_id: 'ai_record_id',
  title: 'title',
  category: 'category',
  content_uri: 'content_uri',
  source: 'source',
  version: 'version',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.WorkspaceScalarFieldEnum = {
  id: 'id',
  workspace_id: 'workspace_id',
  matter_id: 'matter_id',
  task_id: 'task_id',
  timeline_id: 'timeline_id',
  document_id: 'document_id',
  material_id: 'material_id',
  evidence_id: 'evidence_id',
  workflow_event_id: 'workflow_event_id',
  ai_record_id: 'ai_record_id',
  knowledge_id: 'knowledge_id',
  layout: 'layout',
  view_config: 'view_config',
  preferences: 'preferences',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.SystemEnumScalarFieldEnum = {
  id: 'id',
  enum_key: 'enum_key',
  enum_value: 'enum_value',
  label: 'label',
  sort_order: 'sort_order',
  is_active: 'is_active',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.SystemConfigurationScalarFieldEnum = {
  id: 'id',
  config_key: 'config_key',
  config_value: 'config_value',
  description: 'description',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.SystemDictionaryScalarFieldEnum = {
  id: 'id',
  dict_type: 'dict_type',
  dict_key: 'dict_key',
  dict_value: 'dict_value',
  sort_order: 'sort_order',
  is_active: 'is_active',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ExecutionQueueItemScalarFieldEnum = {
  id: 'id',
  matter_id: 'matter_id',
  queue_id: 'queue_id',
  action_id: 'action_id',
  work_id: 'work_id',
  slot: 'slot',
  execution_status: 'execution_status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.FactScalarFieldEnum = {
  id: 'id',
  fact_id: 'fact_id',
  matter_id: 'matter_id',
  title: 'title',
  description: 'description',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.FactDraftScalarFieldEnum = {
  id: 'id',
  draft_id: 'draft_id',
  matter_id: 'matter_id',
  title: 'title',
  description: 'description',
  confidence: 'confidence',
  ai_reasoning: 'ai_reasoning',
  source_evidence_ids: 'source_evidence_ids',
  review_status: 'review_status',
  lawyer_note: 'lawyer_note',
  published_fact_id: 'published_fact_id',
  published_at: 'published_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.FactEvidenceScalarFieldEnum = {
  id: 'id',
  fact_id: 'fact_id',
  evidence_id: 'evidence_id',
  note: 'note',
  created_at: 'created_at'
};

exports.Prisma.IssueScalarFieldEnum = {
  id: 'id',
  issue_id: 'issue_id',
  matter_id: 'matter_id',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.IssueDraftScalarFieldEnum = {
  id: 'id',
  matter_id: 'matter_id',
  title: 'title',
  description: 'description',
  confidence: 'confidence',
  ai_reasoning: 'ai_reasoning',
  source_fact_ids: 'source_fact_ids',
  review_status: 'review_status',
  lawyer_note: 'lawyer_note',
  published_issue_id: 'published_issue_id',
  published_at: 'published_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.LawScalarFieldEnum = {
  id: 'id',
  law_id: 'law_id',
  matter_id: 'matter_id',
  issue_id: 'issue_id',
  title: 'title',
  citation: 'citation',
  description: 'description',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.LawDraftScalarFieldEnum = {
  id: 'id',
  matter_id: 'matter_id',
  title: 'title',
  citation: 'citation',
  rule_content: 'rule_content',
  application: 'application',
  limitations: 'limitations',
  jurisdiction: 'jurisdiction',
  source_reference: 'source_reference',
  confidence: 'confidence',
  ai_reasoning: 'ai_reasoning',
  source_issue_ids: 'source_issue_ids',
  review_status: 'review_status',
  lawyer_note: 'lawyer_note',
  published_law_id: 'published_law_id',
  published_at: 'published_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.LawIssueScalarFieldEnum = {
  id: 'id',
  law_id: 'law_id',
  issue_id: 'issue_id',
  created_at: 'created_at'
};

exports.Prisma.ArgumentScalarFieldEnum = {
  id: 'id',
  argument_id: 'argument_id',
  matter_id: 'matter_id',
  issue_id: 'issue_id',
  title: 'title',
  description: 'description',
  conclusion: 'conclusion',
  status: 'status',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ArgumentDraftScalarFieldEnum = {
  id: 'id',
  matter_id: 'matter_id',
  title: 'title',
  position: 'position',
  reasoning: 'reasoning',
  counter_argument: 'counter_argument',
  response: 'response',
  risk: 'risk',
  conclusion: 'conclusion',
  confidence: 'confidence',
  ai_reasoning: 'ai_reasoning',
  source_fact_ids: 'source_fact_ids',
  source_issue_ids: 'source_issue_ids',
  source_law_ids: 'source_law_ids',
  review_status: 'review_status',
  lawyer_note: 'lawyer_note',
  published_argument_id: 'published_argument_id',
  published_at: 'published_at',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.ArgumentFactScalarFieldEnum = {
  id: 'id',
  argument_id: 'argument_id',
  fact_id: 'fact_id',
  created_at: 'created_at'
};

exports.Prisma.ArgumentIssueScalarFieldEnum = {
  id: 'id',
  argument_id: 'argument_id',
  issue_id: 'issue_id',
  created_at: 'created_at'
};

exports.Prisma.ArgumentLawScalarFieldEnum = {
  id: 'id',
  argument_id: 'argument_id',
  law_id: 'law_id',
  created_at: 'created_at'
};

exports.Prisma.DocumentArgumentScalarFieldEnum = {
  id: 'id',
  document_id: 'document_id',
  argument_id: 'argument_id',
  created_at: 'created_at'
};

exports.Prisma.DocumentFactScalarFieldEnum = {
  id: 'id',
  document_id: 'document_id',
  fact_id: 'fact_id',
  created_at: 'created_at'
};

exports.Prisma.DocumentIssueScalarFieldEnum = {
  id: 'id',
  document_id: 'document_id',
  issue_id: 'issue_id',
  created_at: 'created_at'
};

exports.Prisma.DocumentLawScalarFieldEnum = {
  id: 'id',
  document_id: 'document_id',
  law_id: 'law_id',
  created_at: 'created_at'
};

exports.Prisma.IssueFactScalarFieldEnum = {
  id: 'id',
  issue_id: 'issue_id',
  fact_id: 'fact_id',
  note: 'note',
  created_at: 'created_at'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  Matter: 'Matter',
  Client: 'Client',
  Material: 'Material',
  Evidence: 'Evidence',
  Document: 'Document',
  DocumentDraft: 'DocumentDraft',
  Task: 'Task',
  Timeline: 'Timeline',
  WorkflowEvent: 'WorkflowEvent',
  AiRecord: 'AiRecord',
  Knowledge: 'Knowledge',
  Workspace: 'Workspace',
  SystemEnum: 'SystemEnum',
  SystemConfiguration: 'SystemConfiguration',
  SystemDictionary: 'SystemDictionary',
  ExecutionQueueItem: 'ExecutionQueueItem',
  Fact: 'Fact',
  FactDraft: 'FactDraft',
  FactEvidence: 'FactEvidence',
  Issue: 'Issue',
  IssueDraft: 'IssueDraft',
  Law: 'Law',
  LawDraft: 'LawDraft',
  LawIssue: 'LawIssue',
  Argument: 'Argument',
  ArgumentDraft: 'ArgumentDraft',
  ArgumentFact: 'ArgumentFact',
  ArgumentIssue: 'ArgumentIssue',
  ArgumentLaw: 'ArgumentLaw',
  DocumentArgument: 'DocumentArgument',
  DocumentFact: 'DocumentFact',
  DocumentIssue: 'DocumentIssue',
  DocumentLaw: 'DocumentLaw',
  IssueFact: 'IssueFact'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
