import { createCliAgentAdapterApp } from "./adapter";
import { resolveServerTimeoutConfig } from "./serverConfig";

const PORT = Number(process.env.PORT ?? 8787);
const app = createCliAgentAdapterApp(process.env);
const serverTimeouts = resolveServerTimeoutConfig(process.env);

const server = app.listen(PORT, () => {
  console.log(
    `cli-agent-adapter listening on :${PORT} (requestTimeout=${serverTimeouts.requestTimeoutMs}ms, headersTimeout=${serverTimeouts.headersTimeoutMs}ms, keepAliveTimeout=${serverTimeouts.keepAliveTimeoutMs}ms)`
  );
});

server.requestTimeout = serverTimeouts.requestTimeoutMs;
server.headersTimeout = serverTimeouts.headersTimeoutMs;
server.keepAliveTimeout = serverTimeouts.keepAliveTimeoutMs;
