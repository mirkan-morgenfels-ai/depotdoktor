import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReportMetric, ReportPdfData, ReportTable } from "./types";

const COLORS = {
  navy: "#0b1626",
  ink: "#0f1b2d",
  muted: "#5b6474",
  line: "#e4ddcc",
  gold: "#c9a548",
  goldLight: "#d8bd72",
  goldDeep: "#7d5f17",
  green: "#2f6b3a",
  bordeaux: "#7a1f2b",
  paper: "#f7f3ea",
  ivory: "#f7f3ea",
} as const;

const BAND_HEIGHT = 30;

const styles = StyleSheet.create({
  page: {
    paddingTop: BAND_HEIGHT + 34,
    paddingHorizontal: 48,
    paddingBottom: 72,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: COLORS.ink,
    lineHeight: 1.4,
  },
  band: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: BAND_HEIGHT,
    backgroundColor: COLORS.navy,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.gold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 48,
  },
  bandBrand: { fontFamily: "Times-Roman", fontSize: 11, color: COLORS.ivory, letterSpacing: 0.4 },
  bandBrandAccent: { fontFamily: "Times-Italic", color: COLORS.goldLight },
  bandLabel: { fontSize: 6.5, color: COLORS.goldLight, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 2 },
  eyebrow: { fontSize: 7.5, color: COLORS.goldDeep, letterSpacing: 1.6, textTransform: "uppercase" },
  title: { fontFamily: "Times-Roman", fontSize: 28, lineHeight: 1.1, marginTop: 6, color: COLORS.navy },
  subtitle: { fontSize: 10, color: COLORS.muted, marginTop: 6 },
  meta: { fontSize: 8, color: COLORS.muted, marginTop: 12, paddingBottom: 12, borderBottomWidth: 0.75, borderBottomColor: COLORS.line },
  h2: { fontFamily: "Times-Roman", fontSize: 16, marginTop: 22, marginBottom: 9, color: COLORS.navy },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  metric: { width: "25%", paddingHorizontal: 4, marginBottom: 8 },
  metricInner: {
    borderWidth: 0.75,
    borderColor: COLORS.line,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.gold,
    borderRadius: 3,
    padding: 8,
    backgroundColor: COLORS.paper,
  },
  metricLabel: { fontSize: 6.5, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  metricValue: { fontFamily: "Times-Roman", fontSize: 15, marginTop: 3, color: COLORS.navy },
  metricHint: { fontSize: 7, color: COLORS.muted, marginTop: 5 },
  metricsNote: { fontSize: 8, color: COLORS.muted, marginTop: 2, marginBottom: 4 },
  tableTitle: { fontSize: 9.5, marginTop: 12, marginBottom: 5, fontFamily: "Helvetica-Bold", color: COLORS.navy },
  tableHeader: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: COLORS.navy, paddingBottom: 3, marginBottom: 2 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: COLORS.line, paddingVertical: 3 },
  tableRowEmphasis: { flexDirection: "row", borderTopWidth: 0.75, borderTopColor: COLORS.navy, paddingVertical: 3, fontFamily: "Helvetica-Bold" },
  headerCell: { fontSize: 6.5, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  cell: { fontSize: 9 },
  spacedCell: { paddingLeft: 4 },
  footnote: { fontSize: 7.5, color: COLORS.muted, marginTop: 4 },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletMark: { width: 10, color: COLORS.gold },
  bulletText: { flex: 1, fontSize: 8.5, color: COLORS.muted },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 28,
    fontSize: 7,
    color: COLORS.muted,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.gold,
    paddingTop: 6,
  },
  pageNumber: { position: "absolute", right: 48, bottom: 14, fontSize: 7, color: COLORS.muted },
  footerLine: { position: "absolute", left: 48, bottom: 14, fontSize: 7, color: COLORS.muted },
});

function Band() {
  return (
    <View style={styles.band} fixed>
      <Text style={styles.bandBrand}>
        Depot<Text style={styles.bandBrandAccent}>Doktor</Text>
      </Text>
      <Text style={styles.bandLabel}>Depot-Steuer- und Performance-Analyzer</Text>
    </View>
  );
}

function Metrics({ items }: { items: ReportMetric[] }) {
  return (
    <View style={styles.metricGrid}>
      {items.map((m) => (
        <View key={m.label} style={styles.metric}>
          <View style={styles.metricInner}>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={styles.metricValue}>{m.value}</Text>
            {m.hint ? <Text style={styles.metricHint}>{m.hint}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function Table({ table }: { table: ReportTable }) {
  const count = table.columns.length;
  const widths = table.widths ?? table.columns.map((_, i) => (i === 0 ? 0.34 : 0.66 / (count - 1)));
  const alignOf = (i: number) => table.align?.[i] ?? (i === 0 ? "left" : "right");
  return (
    <View>
      <Text style={styles.tableTitle}>{table.title}</Text>
      <View style={styles.tableHeader} minPresenceAhead={40}>
        {table.columns.map((c, i) => (
          <Text key={c} style={[styles.headerCell, i > 0 ? styles.spacedCell : {}, { width: `${widths[i]! * 100}%`, textAlign: alignOf(i) }]}>
            {c}
          </Text>
        ))}
      </View>
      {table.rows.map((row, r) => (
        <View key={r} style={row.emphasis ? styles.tableRowEmphasis : styles.tableRow} wrap={false}>
          {row.cells.map((cell, i) => (
            <Text key={i} style={[styles.cell, i > 0 ? styles.spacedCell : {}, { width: `${widths[i]! * 100}%`, textAlign: alignOf(i) }]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
      {table.footnote ? <Text style={styles.footnote}>{table.footnote}</Text> : null}
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item) => (
        <View key={item} style={styles.bullet}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Footer({ disclaimer, footerLine }: { disclaimer: string; footerLine: string }) {
  return (
    <>
      <Text style={styles.footer} fixed>
        {disclaimer}
      </Text>
      <Text style={styles.footerLine} fixed>
        {footerLine}
      </Text>
      <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
    </>
  );
}

export function ReportDocument({ data }: { data: ReportPdfData }) {
  return (
    <Document title={data.title} author="DepotDoktor" language="de">
      <Page size="A4" style={styles.page}>
        <Band />
        <Text style={styles.eyebrow}>DepotDoktor · Depot-Report</Text>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>{data.subtitle}</Text>
        <Text style={styles.meta}>
          {data.sourceLine} · Erstellt am {data.generatedAt}
        </Text>

        <Text style={styles.h2}>Performance</Text>
        <Metrics items={data.metrics} />
        <Text style={styles.metricsNote}>{data.metricsNote}</Text>
        <Table table={data.valueTable} />

        <Text style={styles.h2} break>
          Allokation
        </Text>
        <Table table={data.positionsTable} />
        {data.allocationTables.map((t) => (
          <Table key={t.title} table={t} />
        ))}

        <Text style={styles.h2} break>
          Steuer
        </Text>
        <Metrics items={data.taxSummary} />
        {data.taxTables.map((t) => (
          <Table key={t.title} table={t} />
        ))}
        <Text style={styles.tableTitle}>So wird gerechnet</Text>
        <Bullets items={data.taxMethod} />

        {data.notes.length > 0 ? (
          <View>
            <Text style={styles.h2}>Hinweise zur Berechnung</Text>
            <Bullets items={data.notes} />
          </View>
        ) : null}

        <Footer disclaimer={data.disclaimer} footerLine={data.footerLine} />
      </Page>
    </Document>
  );
}
