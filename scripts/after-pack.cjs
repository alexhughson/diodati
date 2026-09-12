const { readdirSync, rmSync } = require("node:fs");
const { join } = require("node:path");

const KEEP_LOCALES = new Set(["en.lproj", "en_GB.lproj", "English.lproj"]);

function stripLocales(resourcesDir) {
  for (const name of readdirSync(resourcesDir)) {
    if (!name.endsWith(".lproj")) {
      continue;
    }
    if (KEEP_LOCALES.has(name)) {
      continue;
    }
    rmSync(join(resourcesDir, name), { recursive: true, force: true });
  }
}

exports.default = async function afterPack(context) {
  const frameworkResources = join(
    context.appOutDir,
    "Diodati.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Resources",
  );
  stripLocales(frameworkResources);
};
