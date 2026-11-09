import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";

const HOST_INFO = { name: "lunch-preview-host", version: "0.1.0" };
const form = document.querySelector<HTMLFormElement>("#request")!;
const iframe = document.querySelector<HTMLIFrameElement>("#widget")!;
const logList = document.querySelector<HTMLOListElement>("#log")!;
const prompt = document.querySelector<HTMLDivElement>("#prompt")!;
const assistant = document.querySelector<HTMLDivElement>("#assistant")!;

type LogKind = "connection" | "tool" | "widget" | "error";

const logLabels: Record<LogKind, string> = {
    connection: "연결",
    tool: "도구 호출",
    widget: "위젯 메시지",
    error: "오류",
};

function log(kind: LogKind, text: string): void {
    const item = document.createElement("li");
    item.className = `log-item log-${kind}`;

    const time = document.createElement("time");
    time.className = "log-time";
    time.textContent = new Date().toLocaleTimeString("ko-KR");

    const label = document.createElement("span");
    label.className = "log-label";
    label.textContent = logLabels[kind];

    const message = document.createElement("span");
    message.className = "log-message";
    message.textContent = text;

    item.append(time, label, message);
    logList.prepend(item);
}

const client = new Client(HOST_INFO);
await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", location.href)));
log("connection", "MCP 서버에 연결했습니다.");

/** ChatGPT가 하는 일을 흉내 낸다: 도구 호출 → UI 리소스 읽기 → iframe에 위젯 표시 → 결과 전달. */
async function callRecommend(args: Record<string, number>): Promise<void> {
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "recommend_lunch");
    const uri = (tool?._meta?.ui as { resourceUri?: string } | undefined)?.resourceUri;
    if (!uri) throw new Error("recommend_lunch 도구에 UI 리소스가 연결되어 있지 않습니다.");

    const result = await client.callTool({ name: "recommend_lunch", arguments: args });
    log("tool", `recommend_lunch ${JSON.stringify(args)}`);
    const text = (result.content as { type: string; text?: string }[]).find((c) => c.type === "text")?.text ?? "";
    assistant.textContent = text;

    const resource = await client.readResource({ uri });
    const html = (resource.contents[0] as { text: string }).text;

    const bridge = new AppBridge(client, HOST_INFO, { openLinks: {}, serverTools: {}, logging: {} });
    bridge.oninitialized = async () => {
        log("widget", "위젯 초기화 완료");
        await bridge.sendToolInput({ arguments: args });
        await bridge.sendToolResult(result);
    };
    bridge.onsizechange = ({ height }) => {
        if (height) iframe.style.height = `${height}px`;
    };
    bridge.onmessage = async (params) => {
        const message = params.content.map((c) => ("text" in c ? c.text : "")).join(" ");
        log("widget", `대화로 메시지 전송: ${message}`);
        prompt.textContent = message;
        return {};
    };
    iframe.srcdoc = html;
    await bridge.connect(new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!));
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const args = { budget: Number(data.get("budget")), maxWalkMinutes: Number(data.get("maxWalkMinutes")) };
    prompt.textContent = `${args.budget.toLocaleString("ko-KR")}원 이하로 ${args.maxWalkMinutes}분 안에 갈 수 있는 점심 추천해 줘`;
    void callRecommend(args).catch((error) => log("error", error.message));
});

form.requestSubmit();
