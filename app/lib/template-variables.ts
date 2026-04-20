// UI-facing metadata for every template variable supported by
// `replaceVariables()` in text-variables.ts. Kept in a separate file so
// the server-side expansion logic stays independent of the editor UI.

export type VariableGroup = "certificate" | "batch" | "datetime";

export type VariableDef = {
  token: string; // e.g. "{certificate.fullName}"
  label: string; // human-friendly Turkish label
  description: string; // 1-line explanation
  example: string; // realistic example expansion
  group: VariableGroup;
};

export const VARIABLE_GROUPS: Record<VariableGroup, string> = {
  certificate: "Sertifika",
  batch: "Dönem",
  datetime: "Tarih",
};

export const TEMPLATE_VARIABLES: VariableDef[] = [
  // Certificate
  {
    token: "{certificate.fullName}",
    label: "Ad Soyad",
    description: "Katılımcının adı ve soyadı",
    example: "İbrahim Çoban",
    group: "certificate",
  },
  {
    token: "{certificate.fullNameCaps}",
    label: "AD SOYAD (BÜYÜK HARF)",
    description: "Katılımcının adı ve soyadı, tümü büyük harf",
    example: "İBRAHİM ÇOBAN",
    group: "certificate",
  },
  {
    token: "{certificate.firstName}",
    label: "Ad",
    description: "Katılımcının adı",
    example: "İbrahim",
    group: "certificate",
  },
  {
    token: "{certificate.firstNameCaps}",
    label: "AD (BÜYÜK HARF)",
    description: "Katılımcının adı, büyük harf",
    example: "İBRAHİM",
    group: "certificate",
  },
  {
    token: "{certificate.lastName}",
    label: "Soyad",
    description: "Katılımcının soyadı",
    example: "Çoban",
    group: "certificate",
  },
  {
    token: "{certificate.lastNameCaps}",
    label: "SOYAD (BÜYÜK HARF)",
    description: "Katılımcının soyadı, büyük harf",
    example: "ÇOBAN",
    group: "certificate",
  },
  {
    token: "{certificate.teamName}",
    label: "Takım adı",
    description: "Katılımcının takım / grup adı (varsa)",
    example: "METUSTARS",
    group: "certificate",
  },
  {
    token: "{certificate.id}",
    label: "Sertifika kimliği",
    description: "Sertifikanın benzersiz UUID'si",
    example: "a9c1…e7f8",
    group: "certificate",
  },
  // Batch
  {
    token: "{batch.name}",
    label: "Dönem adı",
    description: "Sertifikanın ait olduğu dönemin adı",
    example: "2026 Bahar",
    group: "batch",
  },
  {
    token: "{batch.startDate}",
    label: "Dönem başlangıç tarihi",
    description: "Dönemin başladığı gün (kısa biçim)",
    example: "1 Şub 2026",
    group: "batch",
  },
  {
    token: "{batch.endDate}",
    label: "Dönem bitiş tarihi",
    description: "Dönemin bittiği gün (kısa biçim)",
    example: "30 Haz 2026",
    group: "batch",
  },
  {
    token: "{batch.signatureDate}",
    label: "İmza tarihi",
    description: "Dönem bitiş tarihi, gün/ay/yıl biçiminde",
    example: "30.06.2026",
    group: "batch",
  },
  {
    token: "{batch.signatureDateLong}",
    label: "İmza tarihi (uzun)",
    description: "Dönem bitiş tarihi, ay adı yazılı biçimde",
    example: "30 Haziran 2026",
    group: "batch",
  },
  // Datetime
  {
    token: "{datetime.currentDate}",
    label: "Bugünün tarihi",
    description: "Sertifikanın üretildiği gün (kısa biçim)",
    example: "21 Nis 2026",
    group: "datetime",
  },
  {
    token: "{datetime.currentMonth}",
    label: "Bulunulan ay",
    description: "Üretim anındaki ay ve yıl (uzun biçim)",
    example: "Nisan 2026",
    group: "datetime",
  },
];

export function variablesByGroup(): Record<VariableGroup, VariableDef[]> {
  const groups: Record<VariableGroup, VariableDef[]> = {
    certificate: [],
    batch: [],
    datetime: [],
  };
  for (const v of TEMPLATE_VARIABLES) groups[v.group].push(v);
  return groups;
}
