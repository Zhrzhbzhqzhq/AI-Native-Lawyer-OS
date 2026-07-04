import "dotenv/config";
import buildApp from './server';

const port = Number(process.env.API_PORT || 4000);

async function bootstrap() {
  const app = await buildApp();
  await app.listen({ port, host: '0.0.0.0' });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
