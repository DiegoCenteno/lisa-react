export const PDF_REPORT_TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  lab_attachment: 'Adjunto para laboratorio',
  imaging_order: 'Solicitud de gabinete / imagen',
  preop: 'Indicaciones preoperatorias',
  procedure: 'Procedimiento / consentimiento',
  referral: 'Interconsulta / referencia',
  administrative: 'Documento administrativo',
  general_report: 'Reporte general',
  custom: 'Personalizado',
};

export function getPdfReportTemplateCategoryLabel(value?: string | null): string {
  if (!value) {
    return 'Sin categoria';
  }

  return PDF_REPORT_TEMPLATE_CATEGORY_LABELS[value] || value;
}
