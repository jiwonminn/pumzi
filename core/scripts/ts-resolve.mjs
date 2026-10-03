// Test-only: lets Node resolve extensionless .ts imports the way the Next bundler does.
import { register } from "node:module";

register("./ts-resolve-hooks.mjs", import.meta.url);
