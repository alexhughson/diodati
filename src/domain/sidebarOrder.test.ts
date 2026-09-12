import { expect, test } from "bun:test";
import { demoCatalogs } from "./demo";
import { moveManualOrder, sortCatalogs, syncManualOrder } from "./sidebarOrder";

test("default sort is by machine name", () => {
  const catalogs = demoCatalogs();
  const sorted = sortCatalogs(catalogs, "default", []);
  expect(sorted.map((item) => item.machine.id)).toEqual(["lake-geneva", "mont-blanc", "villa-diodati"]);
});

test("recent sort uses the newest thread on each machine", () => {
  const catalogs = demoCatalogs();
  const sorted = sortCatalogs(catalogs, "recent", []);
  expect(sorted.map((item) => item.machine.id)).toEqual(["villa-diodati", "mont-blanc", "lake-geneva"]);
});

test("manual sort follows the saved order and appends new machines", () => {
  const catalogs = demoCatalogs();
  const sorted = sortCatalogs(catalogs, "manual", ["mont-blanc", "villa-diodati"]);
  expect(sorted.map((item) => item.machine.id)).toEqual(["mont-blanc", "villa-diodati", "lake-geneva"]);
});

test("syncManualOrder drops missing ids and keeps the saved sequence", () => {
  const catalogs = demoCatalogs();
  expect(syncManualOrder(["gone", "villa-diodati", "villa-diodati"], catalogs)).toEqual([
    "villa-diodati",
    "lake-geneva",
    "mont-blanc",
  ]);
});

test("moveManualOrder inserts the source before the target", () => {
  expect(moveManualOrder(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
  expect(moveManualOrder(["a", "b", "c"], "a", "c")).toEqual(["b", "a", "c"]);
  expect(moveManualOrder(["a", "b", "c"], "b", "b")).toEqual(["a", "b", "c"]);
});
