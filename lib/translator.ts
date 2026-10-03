import type { TranslationPipelineType } from "@xenova/transformers";

const MODEL_NAME = "Xenova/nllb-200-distilled-600M";

let translatorPromise: Promise<TranslationPipelineType> | null = null;
let translatorLoaded = false;

async function getTranslator(): Promise<TranslationPipelineType> {
  if (!translatorPromise) {
    translatorPromise = import("@xenova/transformers/dist/transformers.js")
      .then(({ env, pipeline }) => {
        env.allowLocalModels = false;
        return pipeline("translation", MODEL_NAME);
      })
      .then((translator) => {
        translatorLoaded = true;
        return translator;
      })
      .catch((error: unknown) => {
        translatorPromise = null;
        throw error;
      });
  }

  return translatorPromise;
}

export function isTranslatorLoaded(): boolean {
  return translatorLoaded;
}

export async function loadTranslator(): Promise<void> {
  await getTranslator();
}

export async function translateSwahiliToEnglish(text: string): Promise<string> {
  const translator = await getTranslator();
  const generationOptions: Parameters<TranslationPipelineType>[1] & {
    src_lang: "swh_Latn";
    tgt_lang: "eng_Latn";
  } = {
    src_lang: "swh_Latn",
    tgt_lang: "eng_Latn",
  };
  const output = await translator(text, generationOptions);

  const firstResult = Array.isArray(output[0]) ? output[0][0] : output[0];

  if (!firstResult?.translation_text) {
    throw new Error("The translation model returned an empty result.");
  }

  return firstResult.translation_text;
}
