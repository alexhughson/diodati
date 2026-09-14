import { expect, test } from "bun:test";
import {
  linesFromOldNew,
  linesFromUnifiedDiff,
  patchFromDisplay,
  patchFromInput,
  patchSummary,
  patchViewForTool,
} from "./patch";

const REQUIREMENTS_DIFF = `--- /home/exedev/textbook-search/requirements.txt
+++ /home/exedev/textbook-search/requirements.txt
@@ -0,0 +1,8 @@
+starlette==1.6.0
+uvicorn==0.52.4
+htpy==26.5.1
+python-multipart==0.0.32
+pymupdf==1.28.2
+sqlite-vec==0.1.9
+fastembed==0.8.0
+httpx==0.28.1
`;

test("a real patch Display becomes add lines and a path summary", () => {
  const view = patchFromDisplay({
    path: "/home/exedev/textbook-search/requirements.txt",
    diff: REQUIREMENTS_DIFF,
  });
  if (!view) {
    throw new Error("expected a patch view");
  }
  expect(view.path).toBe("/home/exedev/textbook-search/requirements.txt");
  expect(view.added).toBe(8);
  expect(view.deleted).toBe(0);
  expect(view.lines[0]).toEqual({
    kind: "meta",
    text: "--- /home/exedev/textbook-search/requirements.txt",
  });
  expect(view.lines[3]).toEqual({ kind: "add", text: "+starlette==1.6.0" });
  expect(patchSummary(view)).toBe("requirements.txt +8");
});

test("unified diff keeps hunk headers as meta and counts only body lines", () => {
  const lines = linesFromUnifiedDiff(`--- a/foo.ts
+++ b/foo.ts
@@ -1,3 +1,4 @@
 keep
-old
+new
+extra
`);
  expect(lines.map((line) => line.kind)).toEqual(["meta", "meta", "meta", "ctx", "del", "add", "add"]);
});

test("old and new text share a prefix and suffix", () => {
  const lines = linesFromOldNew("alpha\nbeta\ngamma\n", "alpha\nBETA\ngamma\n");
  expect(lines).toEqual([
    { kind: "ctx", text: " alpha" },
    { kind: "del", text: "-beta" },
    { kind: "add", text: "+BETA" },
    { kind: "ctx", text: " gamma" },
  ]);
});

test("tool input alone yields a running overwrite as adds", () => {
  const view = patchFromInput({
    path: "requirements.txt",
    patches: [
      {
        operation: "overwrite",
        oldText: "",
        newText: "starlette==1.6.0\nuvicorn==0.52.4\n",
      },
    ],
  });
  if (!view) {
    throw new Error("expected a patch view");
  }
  expect(view.path).toBe("requirements.txt");
  expect(view.added).toBe(2);
  expect(view.lines).toEqual([
    { kind: "add", text: "+starlette==1.6.0" },
    { kind: "add", text: "+uvicorn==0.52.4" },
  ]);
});

test("Display diff wins over the raw tool input body", () => {
  const view = patchViewForTool(
    "patch",
    {
      path: "requirements.txt",
      patches: [{ oldText: "", newText: "ignored\n", operation: "overwrite" }],
    },
    {
      path: "/home/exedev/textbook-search/requirements.txt",
      diff: REQUIREMENTS_DIFF,
    },
  );
  if (!view) {
    throw new Error("expected a patch view");
  }
  expect(view.path).toBe("/home/exedev/textbook-search/requirements.txt");
  expect(view.added).toBe(8);
});

test("legacy oldContent and newContent still parse", () => {
  const view = patchFromDisplay({
    path: "note.txt",
    oldContent: "hello\n",
    newContent: "hello\nworld\n",
  });
  if (!view) {
    throw new Error("expected a patch view");
  }
  expect(view.added).toBe(1);
  expect(view.deleted).toBe(0);
  expect(view.lines).toEqual([
    { kind: "ctx", text: " hello" },
    { kind: "add", text: "+world" },
  ]);
});

test("other tools do not get a patch view", () => {
  expect(patchViewForTool("bash", { command: "ls" }, { path: "x", diff: "+x\n" })).toBeUndefined();
});
