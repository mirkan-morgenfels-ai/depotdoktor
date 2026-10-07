export interface ReportMetric {
  label: string;
  value: string;
  hint?: string;
}

export interface ReportTableRow {
  cells: string[];
  emphasis?: boolean;
}

export interface ReportTable {
  title: string;
  columns: string[];
  align?: Array<"left" | "right">;
  widths?: number[];
  rows: ReportTableRow[];
  footnote?: string;
}

export interface ReportPdfData {
  title: string;
  subtitle: string;
  generatedAt: string;
  sourceLine: string;
  metrics: ReportMetric[];
  metricsNote: string;
  valueTable: ReportTable;
  positionsTable: ReportTable;
  allocationTables: ReportTable[];
  taxSummary: ReportMetric[];
  taxTables: ReportTable[];
  taxMethod: string[];
  notes: string[];
  disclaimer: string;
  footerLine: string;
}
