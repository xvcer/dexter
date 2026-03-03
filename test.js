#!/usr/bin/env bun
import "dotenv/config";
import { runAgentForMessage } from "./src/gateway/agent-runner.js";

async function testAgent() {
  const query = "您好";
  console.log(`发送请求: "${query}"...`);

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
    console.error("\n❌ 请求超时 (30秒)");
    process.exit(1);
  }, 30000);

  try {
    const response = await runAgentForMessage({
      sessionKey: "test-session-" + Date.now(),
      query: query,
      model: "gemini-3.1-pro-preview",
      modelProvider: "tuzi",
      signal: controller.signal,
      onEvent: (event) => {
        if (event.type === "thinking") {
          process.stdout.write(`🤔 思考中: ${event.message}\r`);
        } else if (event.type === "tool_start") {
          console.log(`\n🛠️ 调用工具: ${event.tool}`);
        }
      },
    });

    clearTimeout(timeout);
    console.log("\n✅ 收到回复:");
    console.log("-------------------");
    console.log(response || "(无回复内容)");
    console.log("-------------------");
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      console.error("\n❌ 请求已被中止 (超时)");
    } else {
      console.error("\n❌ 发生错误:", err.message);
    }
    process.exit(1);
  }
}

testAgent();
