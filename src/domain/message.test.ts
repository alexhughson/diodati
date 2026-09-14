import { expect, test } from "bun:test";
import { layoutMessage, projectMessage, projectMessages, segmentBlocks } from "./message";

test("user text comes from llm content", () => {
  const message = projectMessage({
    message_id: "m1",
    conversation_id: "c1",
    sequence_id: 1,
    type: "user",
    created_at: "2026-09-11T12:00:00Z",
    llm_data: JSON.stringify({
      Content: [{ Type: 2, Text: "list the files" }],
    }),
  });
  expect(message.role).toBe("user");
  expect(message.blocks).toEqual([{ kind: "text", text: "list the files" }]);
});

test("agent text and tool blocks stay in order", () => {
  const message = projectMessage({
    message_id: "m2",
    conversation_id: "c1",
    sequence_id: 2,
    type: "agent",
    created_at: "2026-09-11T12:00:01Z",
    llm_data: JSON.stringify({
      Content: [
        { Type: 3, Thinking: "look around" },
        { Type: 5, ID: "tool-1", ToolName: "bash", ToolInput: { command: "ls" } },
        { Type: 6, ToolUseID: "tool-1", ToolResult: [{ Text: "README.md" }] },
        { Type: 2, Text: "there is a readme" },
      ],
    }),
  });
  expect(message.blocks[0]).toEqual({ kind: "thinking", text: "look around" });
  expect(message.blocks[1]).toEqual({
    kind: "tool",
    id: "tool-1",
    name: "bash",
    inputText: JSON.stringify({ command: "ls" }, null, 2),
    outputText: "README.md",
    running: false,
    errored: false,
  });
  expect(message.blocks[2]).toEqual({ kind: "text", text: "there is a readme" });
});

test("adjacent tool blocks become one segment", () => {
  const bash = {
    kind: "tool" as const,
    id: "t1",
    name: "bash",
    inputText: "ls",
    outputText: "",
    running: false,
    errored: false,
  };
  const read = {
    kind: "tool" as const,
    id: "t2",
    name: "read",
    inputText: "README.md",
    outputText: "",
    running: false,
    errored: false,
  };
  const segments = segmentBlocks([
    { kind: "text", text: "start" },
    bash,
    read,
    { kind: "text", text: "done" },
  ]);
  expect(segments).toEqual([
    { kind: "lone", block: { kind: "text", text: "start" } },
    { kind: "tools", tools: [bash, read] },
    { kind: "lone", block: { kind: "text", text: "done" } },
  ]);
});

test("a single tool stays a lone block", () => {
  const bash = {
    kind: "tool" as const,
    id: "t1",
    name: "bash",
    inputText: "ls",
    outputText: "",
    running: false,
    errored: false,
  };
  expect(segmentBlocks([bash])).toEqual([{ kind: "lone", block: bash }]);
});

test("tools stay out of the agent prose layout", () => {
  const bash = {
    kind: "tool" as const,
    id: "t1",
    name: "bash",
    inputText: "ls",
    outputText: "a",
    running: false,
    errored: false,
  };
  const read = {
    kind: "tool" as const,
    id: "t2",
    name: "read",
    inputText: "a",
    outputText: "ok",
    running: false,
    errored: false,
  };
  expect(
    layoutMessage([
      { kind: "thinking", text: "look" },
      bash,
      read,
      { kind: "text", text: "done" },
    ]),
  ).toEqual([
    { kind: "thinking", text: "look" },
    { kind: "tools", tools: [bash, read] },
    { kind: "prose", blocks: [{ kind: "text", text: "done" }] },
  ]);
});

test("a compact in_progress row becomes a status notice", () => {
  const message = projectMessage({
    message_id: "d1",
    conversation_id: "c1",
    sequence_id: 10,
    type: "agent",
    created_at: "2026-09-14T12:00:00Z",
    user_data: JSON.stringify({
      distill_status: "in_progress",
      source_slug: "configure-models",
      new_generation: "true",
      distill_method: "compact",
    }),
    llm_data: JSON.stringify({
      Content: [{ Type: 2, Text: "Distilling conversation…" }],
    }),
  });
  expect(message.blocks).toEqual([{ kind: "notice", text: 'Compacting conversation "configure-models"…' }]);
});

test("a finished compact hides the in_progress notice", () => {
  const messages = projectMessages([
    {
      message_id: "d1",
      conversation_id: "c1",
      sequence_id: 10,
      type: "agent",
      created_at: "2026-09-14T12:00:00Z",
      user_data: JSON.stringify({
        distill_status: "in_progress",
        source_slug: "configure-models",
        new_generation: "true",
        distill_method: "compact",
      }),
    },
    {
      message_id: "d2",
      conversation_id: "c1",
      sequence_id: 11,
      type: "agent",
      created_at: "2026-09-14T12:01:00Z",
      user_data: JSON.stringify({
        distill_status: "complete",
        source_slug: "configure-models",
        new_generation: "true",
        distill_method: "compact",
      }),
    },
  ]);
  expect(messages.map((item) => item.blocks)).toEqual([
    [{ kind: "notice", text: 'Compacted from "configure-models"' }],
  ]);
});

test("adjacent thoughts join outside the agent prose layout", () => {
  expect(
    layoutMessage([
      { kind: "thinking", text: "first" },
      { kind: "thinking", text: "second" },
      { kind: "text", text: "answer" },
    ]),
  ).toEqual([
    { kind: "thinking", text: "first\n\nsecond" },
    { kind: "prose", blocks: [{ kind: "text", text: "answer" }] },
  ]);
});

test("a running patch uses the tool input until Display arrives", () => {
  const message = projectMessage({
    message_id: "patch-running",
    conversation_id: "cYGP7OT",
    sequence_id: 10,
    type: "agent",
    created_at: "2026-09-11T12:00:00Z",
    llm_data: JSON.stringify({
      Content: [
        {
          Type: 5,
          ID: "call_running_patch",
          ToolName: "patch",
          ToolInput: {
            path: "requirements.txt",
            patches: [
              {
                operation: "overwrite",
                oldText: "",
                newText: "starlette==1.6.0\n",
              },
            ],
          },
        },
      ],
    }),
  });
  const tool = message.blocks[0];
  if (!tool || tool.kind !== "tool") {
    throw new Error("expected a projected patch tool");
  }
  expect(tool.running).toBe(true);
  expect(tool.patch?.path).toBe("requirements.txt");
  expect(tool.patch?.added).toBe(1);
  expect(tool.patch?.lines).toEqual([{ kind: "add", text: "+starlette==1.6.0" }]);
});

test("a patch tool result shows the Display diff, not the input JSON", () => {
  const messages = projectMessages([
    {
      message_id: "238934ef-f4bd-452d-adb9-099d5d0b4be5",
      conversation_id: "cYGP7OT",
      sequence_id: 10,
      type: "agent",
      created_at: "2026-09-11T12:00:00Z",
      llm_data: JSON.stringify({
        Content: [
          {
            Type: 5,
            ID: "call_OnaH5Bm0IICFaEZbttVCb1nN",
            ToolName: "patch",
            ToolInput: {
              path: "requirements.txt",
              patches: [
                {
                  operation: "overwrite",
                  oldText: "",
                  newText: "starlette==1.6.0\nuvicorn==0.52.4\n",
                },
              ],
            },
          },
        ],
      }),
    },
    {
      message_id: "patch-result-1",
      conversation_id: "cYGP7OT",
      sequence_id: 11,
      type: "user",
      created_at: "2026-09-11T12:00:01Z",
      llm_data: JSON.stringify({
        Content: [
          {
            Type: 6,
            ToolUseID: "call_OnaH5Bm0IICFaEZbttVCb1nN",
            ToolResult: [{ Type: 2, Text: "<patches_applied>all</patches_applied>\n" }],
            Display: {
              path: "/home/exedev/textbook-search/requirements.txt",
              diff: "--- /home/exedev/textbook-search/requirements.txt\n+++ /home/exedev/textbook-search/requirements.txt\n@@ -0,0 +1,8 @@\n+starlette==1.6.0\n+uvicorn==0.52.4\n+htpy==26.5.1\n+python-multipart==0.0.32\n+pymupdf==1.28.2\n+sqlite-vec==0.1.9\n+fastembed==0.8.0\n+httpx==0.28.1\n",
            },
          },
        ],
      }),
    },
  ]);
  expect(messages).toHaveLength(1);
  const tool = messages[0]?.blocks[0];
  if (!tool || tool.kind !== "tool") {
    throw new Error("expected a projected patch tool");
  }
  expect(tool.name).toBe("patch");
  expect(tool.outputText).toBe("<patches_applied>all</patches_applied>\n");
  expect(tool.patch?.path).toBe("/home/exedev/textbook-search/requirements.txt");
  expect(tool.patch?.added).toBe(8);
  expect(tool.patch?.deleted).toBe(0);
  expect(tool.patch?.lines[3]).toEqual({ kind: "add", text: "+starlette==1.6.0" });
});

test("tool result on the next user message attaches to the agent tool", () => {
  const messages = projectMessages([
    {
      message_id: "ed2f4cfb-e401-4f2e-9d6d-26c64d38bbc1",
      conversation_id: "cF5XVFE",
      sequence_id: 3,
      type: "agent",
      created_at: "2026-09-03T04:17:10Z",
      llm_data: JSON.stringify({
        Content: [
          { Type: 3, Text: "check load" },
          {
            Type: 5,
            ID: "chatcmpl-tool-841b006930cd8077",
            ToolName: "bash",
            ToolInput: { command: "uptime" },
          },
        ],
      }),
    },
    {
      message_id: "70d2d06a-ce50-4490-bce9-aa88715c8c11",
      conversation_id: "cF5XVFE",
      sequence_id: 5,
      type: "user",
      created_at: "2026-09-03T04:17:12Z",
      llm_data: JSON.stringify({
        Content: [
          {
            Type: 6,
            ToolUseID: "chatcmpl-tool-841b006930cd8077",
            ToolResult: [{ Type: 2, Text: "04:17:11 up 3:43, load average: 22.00" }],
          },
        ],
      }),
    },
  ]);
  expect(messages).toHaveLength(1);
  expect(messages[0].blocks).toEqual([
    { kind: "thinking", text: "check load" },
    {
      kind: "tool",
      id: "chatcmpl-tool-841b006930cd8077",
      name: "bash",
      inputText: JSON.stringify({ command: "uptime" }, null, 2),
      outputText: "04:17:11 up 3:43, load average: 22.00",
      running: false,
      errored: false,
    },
  ]);
});
