interface TemplateContext {
  name: string | null;
  phone: string;
  variables: Record<string, string>;
}

/** Supports {{isim}}/{{ad}} and {{numara}}/{{telefon}} plus any custom column captured in variables. */
export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "isim" || normalizedKey === "ad") return context.name ?? "";
    if (normalizedKey === "numara" || normalizedKey === "telefon") return context.phone;
    return context.variables[key] ?? "";
  });
}
