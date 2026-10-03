// Lets Node's test runner resolve extensionless TypeScript imports inside core/src
// (e.g. import { evaluate } from "./rules/engine"), the same way the Next.js bundler does.
// Used only by `npm test` in core; the app never loads it.
import { register } from "node:module";

register("./ts-resolve-hooks.mjs", import.meta.url);
