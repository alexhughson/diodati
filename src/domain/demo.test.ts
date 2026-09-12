import { expect, test } from "bun:test";
import { groupThreads } from "./catalog";
import { DEMO_SCENE, createDemoMachine, demoCatalogs, demoMachines, demoMessages, demoThread } from "./demo";

test("demo catalogs cover three machines and two folders on villa-diodati", () => {
  const catalogs = demoCatalogs();
  expect(catalogs.map((item) => item.machine.id)).toEqual(["villa-diodati", "mont-blanc", "lake-geneva"]);
  const villa = catalogs[0];
  if (!villa) {
    throw new Error("missing villa-diodati catalog");
  }
  expect(groupThreads(villa.threads).length).toBe(2);
});

test("createDemoMachine adds a named machine and rejects a duplicate", () => {
  const created = createDemoMachine("byron-cabin", demoMachines);
  expect(created.id).toBe("byron-cabin");
  expect(demoCatalogs([...demoMachines, created]).map((item) => item.machine.id)).toContain("byron-cabin");
  expect(() => createDemoMachine("villa-diodati", demoMachines)).toThrow("already listed");
});

test("demo scene thread has a user turn, a thought, a tool, and a reply", () => {
  const thread = demoThread(DEMO_SCENE.machineId, DEMO_SCENE.threadId);
  expect(thread.slug).toBe("watch-the-beacon");
  const messages = demoMessages(thread.id);
  expect(messages[0]?.role).toBe("user");
  expect(messages[1]?.blocks.map((block) => block.kind)).toEqual(["thinking", "tool", "text"]);
});
