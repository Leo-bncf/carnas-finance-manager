import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const VAT_RATES_LABELS = {
  0: "0%",
  2.1: "2,1%",
  5.5: "5,5%",
  10: "10%",
  20: "20%",
};

export default function VatReport() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [isExporting, setIsExporting] = useState(false);

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: () => base44.entities.Receipt.list("-date", 500),
  });

  const filtered = receipts.filter(
    (r) => r.date && r.date.startsWith(selectedYear) && r.status !== "rejete"
  );

  // Summary by VAT rate
  const vatSummary = {};
  filtered.forEach((r) => {
    const rate = r.vat_rate || 0;
    if (!vatSummary[rate]) vatSummary[rate] = { ht: 0, vat: 0, ttc: 0, count: 0 };
    vatSummary[rate].ht += r.amount_ht || 0;
    vatSummary[rate].vat += r.vat_amount || 0;
    vatSummary[rate].ttc += r.amount_ttc || 0;
    vatSummary[rate].count += 1;
  });

  // Monthly breakdown
  const monthlyVat = {};
  filtered.forEach((r) => {
    if (!r.date) return;
    const month = r.date.substring(0, 7);
    if (!monthlyVat[month]) monthlyVat[month] = 0;
    monthlyVat[month] += r.vat_amount || 0;
  });

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const m = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
    return {
      month: format(new Date(parseInt(selectedYear), i, 1), "MMM", { locale: fr }),
      TVA: Math.round((monthlyVat[m] || 0) * 100) / 100,
    };
  });

  const totalHT = filtered.reduce((s, r) => s + (r.amount_ht || 0), 0);
  const totalVAT = filtered.reduce((s, r) => s + (r.vat_amount || 0), 0);
  const totalTTC = filtered.reduce((s, r) => s + (r.amount_ttc || 0), 0);

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const exportToExcel = () => {
    if (filtered.length === 0) return;
    setIsExporting(true);
    try {
      const vatLabel = (rate) => VAT_RATES_LABELS[rate] || `${rate}%`;
      const n2 = (v) => Math.round((v || 0) * 100) / 100;
      const MONEY = '#,##0.00" €"';

      const sorted = [...filtered].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      const aoa = [];
      const moneyCells = [];

      // One row per receipt
      aoa.push(["Date", "Fournisseur", "HT", "TVA %", "TVA", "TTC"]);
      sorted.forEach((r) => {
        aoa.push([
          r.date || "",
          r.vendor || "",
          n2(r.amount_ht),
          vatLabel(r.vat_rate || 0),
          n2(r.vat_amount),
          n2(r.amount_ttc),
        ]);
        const row = aoa.length;
        moneyCells.push(`C${row}`, `E${row}`, `F${row}`);
      });

      // Breakdown by VAT rate (for the TVA return)
      aoa.push([]);
      aoa.push(["Répartition par taux de TVA"]);
      aoa.push(["Taux", "Nb reçus", "Base HT", "TVA", "TTC"]);
      Object.entries(vatSummary)
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([rate, data]) => {
          aoa.push([vatLabel(Number(rate)), data.count, n2(data.ht), n2(data.vat), n2(data.ttc)]);
          const row = aoa.length;
          moneyCells.push(`C${row}`, `D${row}`, `E${row}`);
        });

      // Totals
      aoa.push([]);
      aoa.push(["TOTAUX"]);
      aoa.push(["Total HT", n2(totalHT)]);
      moneyCells.push(`B${aoa.length}`);
      aoa.push(["Total TVA", n2(totalVAT)]);
      moneyCells.push(`B${aoa.length}`);
      aoa.push(["Total TTC", n2(totalTTC)]);
      moneyCells.push(`B${aoa.length}`);
      aoa.push(["Nombre de reçus", filtered.length]);
      aoa.push([]);
      aoa.push([`Année ${selectedYear} — reçus rejetés exclus. Montants en euros.`]);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [{ wch: 12 }, { wch: 26 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
      moneyCells.forEach((addr) => {
        if (ws[addr]) ws[addr].z = MONEY;
      });
      ws["!autofilter"] = { ref: `A1:F${sorted.length + 1}` };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `TVA ${selectedYear}`);
      XLSX.writeFile(wb, `rapport_tva_${selectedYear}.xlsx`);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Rapport TVA</h1>
          <p className="text-sm text-muted-foreground">
            Synthèse de la TVA déductible — Carnas France
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={exportToExcel}
            disabled={isExporting || filtered.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Export..." : "Exporter Excel"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total HT</p>
            <p className="text-2xl font-bold mt-1">{totalHT.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              TVA déductible
            </p>
            <p className="text-2xl font-bold mt-1 text-primary">{totalVAT.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total TTC</p>
            <p className="text-2xl font-bold mt-1">{totalTTC.toFixed(2)} €</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">TVA mensuelle {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  formatter={(value) => `${value.toFixed(2)} €`}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(220, 13%, 87%)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="TVA" fill="hsl(40, 65%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* VAT Rate Breakdown */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Répartition par taux de TVA</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Taux</TableHead>
                <TableHead className="text-right">Nb reçus</TableHead>
                <TableHead className="text-right">Base HT</TableHead>
                <TableHead className="text-right">TVA</TableHead>
                <TableHead className="text-right">TTC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(vatSummary)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([rate, data]) => (
                  <TableRow key={rate}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {VAT_RATES_LABELS[rate] || `${rate}%`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{data.count}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {data.ht.toFixed(2)} €
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums text-primary">
                      {data.vat.toFixed(2)} €
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {data.ttc.toFixed(2)} €
                    </TableCell>
                  </TableRow>
                ))}
              {Object.keys(vatSummary).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucune donnée pour {selectedYear}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </motion.div>
  );
}