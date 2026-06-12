import { NomenclatureFields } from "./nomenclature";

/** Pulls the nomenclature fields out of a form populated by <NomenclatureFieldsEditor>. */
export function fieldsFromForm(formData: FormData): NomenclatureFields {
  const get = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || undefined;
  };
  return {
    batch: get("batch"),
    format: get("format"),
    awareness: get("awareness"),
    angle: get("angle"),
    valueProp: get("valueProp"),
    feature: get("feature"),
    tone: get("tone"),
    segment: get("segment"),
    persona: get("persona"),
    conceptCode: get("conceptCode"),
    hook: get("hook"),
    market: get("market"),
    conceptVars: String(formData.get("conceptVars") ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  };
}
