import { pdf, renderToBuffer } from "@react-pdf/renderer";
import { ReportDocument } from "./ReportDocument";
import type { ReportPdfData } from "./types";

export { ReportDocument } from "./ReportDocument";
export type { ReportMetric, ReportPdfData, ReportTable, ReportTableRow } from "./types";

export async function renderReportPdf(data: ReportPdfData): Promise<Blob> {
  return pdf(<ReportDocument data={data} />).toBlob();
}

export async function renderReportPdfBuffer(data: ReportPdfData): Promise<Uint8Array> {
  return renderToBuffer(<ReportDocument data={data} />);
}
