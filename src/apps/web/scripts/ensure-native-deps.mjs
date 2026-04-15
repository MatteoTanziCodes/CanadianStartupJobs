import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const workspaceDir = process.cwd();

const hasPackage = (packageName) => {
  try {
    require.resolve(`${packageName}/package.json`, { paths: [workspaceDir] });
    return true;
  } catch {
    return false;
  }
};

const getPlatformPackages = () => {
  if (process.platform === "linux") {
    const glibcVersionRuntime = process.report?.getReport?.().header?.glibcVersionRuntime;
    const libc = glibcVersionRuntime ? "gnu" : "musl";

    if (process.arch === "x64") {
      return [
        `lightningcss-linux-x64-${libc}`,
        `@ast-grep/napi-linux-x64-${libc}`,
      ];
    }

    if (process.arch === "arm64") {
      return [
        `lightningcss-linux-arm64-${libc}`,
        `@ast-grep/napi-linux-arm64-${libc}`,
      ];
    }

    if (process.arch === "arm" && libc === "gnu") {
      return ["lightningcss-linux-arm-gnueabihf"];
    }
  }

  if (process.platform === "darwin") {
    if (process.arch === "x64") {
      return ["lightningcss-darwin-x64", "@ast-grep/napi-darwin-x64"];
    }

    if (process.arch === "arm64") {
      return ["lightningcss-darwin-arm64", "@ast-grep/napi-darwin-arm64"];
    }
  }

  if (process.platform === "win32") {
    if (process.arch === "x64") {
      return ["lightningcss-win32-x64-msvc", "@ast-grep/napi-win32-x64-msvc"];
    }

    if (process.arch === "arm64") {
      return ["lightningcss-win32-arm64-msvc", "@ast-grep/napi-win32-arm64-msvc"];
    }
  }

  return [];
};

const requiredPackages = getPlatformPackages();
const missingPackages = requiredPackages.filter((packageName) => !hasPackage(packageName));

if (!missingPackages.length) {
  process.exit(0);
}

console.log(`Installing missing native packages: ${missingPackages.join(", ")}`);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
execFileSync(
  npmCommand,
  [
    "install",
    "--no-save",
    "--include=optional",
    "--workspaces=false",
    ...missingPackages,
  ],
  {
    cwd: workspaceDir,
    stdio: "inherit",
    env: {
      ...process.env,
      npm_config_audit: "false",
      npm_config_fund: "false",
      npm_config_package_lock: "false",
    },
  },
);
