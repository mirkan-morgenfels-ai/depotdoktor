import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReportMetric, ReportPdfData, ReportTable } from "./types";

const COLORS = {
  ink: "#111111",
  muted: "#6b6b66",
  line: "#e3e0d6",
  gold: "#b8912f",
  goldDeep: "#7d5f17",
  green: "#2f6b3a",
  bordeaux: "#7a1f2b",
  paper: "#fbfaf6",
} as const;

const styles = StyleSheet.create({
  page: { padding: 48, paddingBottom: 72, fontFamily: "Helvetica", fontSize: 9.5, color: COLORS.ink, lineHeight: 1.4 },
  eyebrow: { fontSize: 8, color: COLORS.goldDeep, letterSpacing: 1.5, textTransform: "uppercase" },
  title: { fontFamily: "Times-Roman", fontSize: 26, lineHeight: 1.15, marginTop: 6 },
  subtitle: { fontSize: 10, color: COLORS.muted, marginTop: 6 },
  meta: { fontSize: 8, color: COLORS.muted, marginTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  h2: { fontFamily: "Times-Roman", fontSize: 15, marginTop: 20, marginBottom: 8 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  metric: { width: "25%", paddingHorizontal: 4, marginBottom: 8 },
  metricInner: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 4, padding: 8, backgroundColor: COLORS.paper },
  metricLabel: { fontSize: 7, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  metricValue: { fontFamily: "Times-Roman", fontSize: 14, marginTop: 2 },
  metricHint: { fontSize: 7, color: COLORS.muted, marginTop: 2 },
  tableTitle: { fontSize: 10, marginTop: 10, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLORS.ink, paddingBottom: 3, marginBottom: 2 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: COLORS.line, paddingVertical: 3 },
  tableRowEmphasis: { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.ink, paddingVertical: 3, fontFamily: "Helvetica-Bold" },
  headerCell: { fontSize: 7, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  cell: { fontSize: 9 },
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
    borderTopColor: COLORS.line,
    paddingTop: 6,
  },
  pageNumber: { position: "absolute", right: 48, bottom: 14, fontSize: 7, color: COLORS.muted },
});

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
          <Text key={c} style={[styles.headerCell, { width: `${widths[i]! * 100}%`, textAlign: alignOf(i) }]}>
            {c}
          </Text>
        ))}
      </View>
      {table.rows.map((row, r) => (
        <View key={r} style={row.emphasis ? styles.tableRowEmphasis : styles.tableRow} wrap={false}>
          {row.cells.map((cell, i) => (
            <Text key={i} style={[styles.cell, { width: `${widths[i]! * 100}%`, textAlign: alignOf(i) }]}>
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

function Footer({ disclaimer }: { disclaimer: string }) {
  return (
    <>
      <Text style={styles.footer} fixed>
        {disclaimer}
      </Text>
      <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
    </>
  );
}

export function ReportDocument({ data }: { data: ReportPdfData }) {
  return (
    <Document title={data.title} author="DepotDoktor" language="de">
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>DepotDoktor · Depot-Report</Text>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>{data.subtitle}</Text>
        <Text style={styles.meta}>
          {data.sourceLine} · Erstellt am {data.generatedAt}
        </Text>

        <Text style={styles.h2}>Performance</Text>
        <Metrics items={data.metrics} />
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

        <Footer disclaimer={data.disclaimer} />
      </Page>
    </Document>
  );
}
