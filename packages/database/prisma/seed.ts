import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertSystemEnums() {
  const enumRows = [
    ["matter_status", "consultation", "Consultation", 1],
    ["matter_status", "accepted", "Accepted", 2],
    ["matter_status", "active", "Active", 3],
    ["matter_status", "closing", "Closing", 4],
    ["matter_status", "closed", "Closed", 5],
    ["matter_status", "archived", "Archived", 6],
    ["task_priority", "low", "Low", 1],
    ["task_priority", "medium", "Medium", 2],
    ["task_priority", "high", "High", 3],
    ["task_status", "todo", "To Do", 1],
    ["task_status", "in_progress", "In Progress", 2],
    ["task_status", "done", "Done", 3],
    ["evidence_type", "document", "Document", 1],
    ["evidence_type", "audio", "Audio", 2],
    ["evidence_type", "video", "Video", 3],
    ["document_type", "complaint", "Complaint", 1],
    ["document_type", "defense", "Defense", 2],
    ["material_type", "submission", "Submission", 1],
    ["material_type", "archive", "Archive", 2],
    ["ai_task_type", "summary", "Summary", 1],
    ["ai_task_type", "analysis", "Analysis", 2],
    ["knowledge_category", "case", "Case", 1],
    ["knowledge_category", "statute", "Statute", 2],
    ["workspace_layout", "default", "Default", 1]
  ] as const;

  for (const [enum_key, enum_value, label, sort_order] of enumRows) {
    await prisma.systemEnum.upsert({
      where: {
        enum_key_enum_value: {
          enum_key,
          enum_value
        }
      },
      create: { enum_key, enum_value, label, sort_order, is_active: true },
      update: { label, sort_order, is_active: true }
    });
  }

  return enumRows.length;
}

async function upsertSystemConfigurations() {
  const configRows = [
    ["default_workspace_layout", { mode: "default", panels: ["today", "matter", "ai"] }],
    ["default_dashboard", { widgets: ["today_tasks", "risk_alerts", "ai_suggestions"] }],
    ["default_ai_config", { provider: "openai", model: "gpt-4o-mini", temperature: 0.2 }],
    ["system_parameters", { timezone: "UTC", locale: "en-US" }]
  ] as const;

  for (const [config_key, config_value] of configRows) {
    await prisma.systemConfiguration.upsert({
      where: { config_key },
      create: { config_key, config_value },
      update: { config_value }
    });
  }

  return configRows.length;
}

async function upsertSystemDictionary() {
  const dictionaryRows = [
    ["country", "CN", "China", 1],
    ["country", "US", "United States", 2],
    ["region", "CN-11", "Beijing", 1],
    ["region", "CN-31", "Shanghai", 2],
    ["court_level", "basic", "Basic People's Court", 1],
    ["court_level", "intermediate", "Intermediate People's Court", 2],
    ["court_type", "civil", "Civil", 1],
    ["court_type", "criminal", "Criminal", 2],
    ["case_type", "contract", "Contract Dispute", 1],
    ["case_type", "labor", "Labor Dispute", 2]
  ] as const;

  for (const [dict_type, dict_key, dict_value, sort_order] of dictionaryRows) {
    await prisma.systemDictionary.upsert({
      where: {
        dict_type_dict_key: {
          dict_type,
          dict_key
        }
      },
      create: { dict_type, dict_key, dict_value, sort_order, is_active: true },
      update: { dict_value, sort_order, is_active: true }
    });
  }

  return dictionaryRows.length;
}

async function main() {
  const enumCount = await upsertSystemEnums();
  const configCount = await upsertSystemConfigurations();
  const dictionaryCount = await upsertSystemDictionary();

  console.log(
    JSON.stringify(
      {
        seed_scope: "system initialization only",
        seeded: {
          system_enums: enumCount,
          default_configurations: configCount,
          base_dictionary: dictionaryCount
        },
        forbidden_seed_objects: [
          "matters",
          "clients",
          "materials",
          "evidence",
          "documents",
          "tasks",
          "timelines",
          "workflow_events",
          "ai_records",
          "knowledge",
          "workspaces"
        ]
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
