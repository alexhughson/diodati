import { requireMachine } from "../src/domain/machine";
import { listExeMachines } from "../src/infra/exeLs";
import { createDraft, listMachineModels, listMachineThreads } from "../src/infra/shelleyRemote";

const machines = await listExeMachines([null]);
if (machines.length === 0) {
  throw new Error("ssh exe.dev ls returned no machines");
}
const alley = requireMachine(machines, "alley-tablebase");
const models = await listMachineModels(alley);
const before = await listMachineThreads(alley);
const first = models[0];
if (!first) {
  throw new Error("alley-tablebase Shelley returned no ready models");
}
const draft = await createDraft(alley, {
  model: first.id,
  cwd: null,
  thinkingLevel: first.defaultReasoningLevel,
});
const after = await listMachineThreads(alley);
const found = after.find((thread) => thread.id === draft.id);
if (!found) {
  throw new Error("created draft is missing from alley-tablebase snapshot");
}

console.log(
  JSON.stringify(
    {
      machines: machines.map((machine) => machine.id),
      modelCount: models.length,
      defaultModel: first.id,
      threadsBefore: before.length,
      draftId: draft.id,
      threadsAfter: after.length,
    },
    null,
    2,
  ),
);
