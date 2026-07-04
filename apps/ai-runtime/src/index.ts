import "dotenv/config";
import Fastify from "fastify";

const app = Fastify({ logger: true });
const port = Number(process.env.AI_RUNTIME_PORT || 4100);

app.get("/health", async () => ({ status: "ok", service: "ai-runtime" }));

app.post("/analyze", async () => {
  return {
    status: "ok",
    provider: process.env.AI_MODEL_PROVIDER || "openai",
    model: process.env.AI_MODEL_NAME || "gpt-4o-mini",
    message: "AI runtime bootstrap completed"
  };
});

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
