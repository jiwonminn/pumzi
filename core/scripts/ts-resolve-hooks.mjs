// Resolve hook: if a relative import has no extension and isn't found, try the .ts file.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    const hasExtension = /\.[cm]?[jt]s$/.test(specifier);
    if (error?.code === "ERR_MODULE_NOT_FOUND" && relative && !hasExtension) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw error;
  }
}
