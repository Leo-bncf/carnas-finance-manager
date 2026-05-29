import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import {
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const CATEGORIES = [
  { value: "fournitures", label: "Fournitures" },
  { value: "transport", label: "Transport" },
  { value: "services", label: "Services" },
  { value: "restauration", label: "Restauration" },
  { value: "logement", label: "Logement" },
  { value: "telecommunication", label: "Télécommunication" },
  { value: "assurance", label: "Assurance" },
  { value: "marketing", label: "Marketing" },
  { value: "entretien", label: "Entretien" },
  { value: "energie", label: "Énergie" },
  { value: "autres", label: "Autres" },
];

const PAYMENT_METHODS = [
  { value: "carte_bancaire", label: "Carte bancaire" },
  { value: "especes", label: "Espèces" },
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
  { value: "prelevement", label: "Prélèvement" },
];

const VAT_RATES = [0, 2.1, 5.5, 10, 20];

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

export default function AddReceipt() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);

  const extractReceipts = async (fileUrl) => {
    const categoryValues = CATEGORIES.map((c) => c.value).join(", ");
    const paymentValues = PAYMENT_METHODS.map((m) => m.value).join(", ");
    const prompt = `Tu es un assistant comptable français. Cette image ou ce PDF peut contenir PLUSIEURS tickets de caisse / reçus distincts sur la même page. Extrais les données de CHAQUE ticket : un objet par ticket physique.

Pour chaque ticket, extrais :
- vendor: nom du commerçant / fournisseur, exactement comme imprimé
- date: date du ticket au format AAAA-MM-JJ
- amount_ttc: montant total payé TTC (nombre, sois précis)
- vat_rate: taux de TVA principal du ticket parmi 0, 2.1, 5.5, 10, 20 (TVA française). S'il n'est pas imprimé, déduis-le (20 par défaut ; 5.5 pour l'alimentation ; 10 pour restauration/transport)
- vat_amount: montant de TVA imprimé sur le ticket si présent, sinon 0 (il sera recalculé)
- amount_ht: montant HT imprimé si présent, sinon 0 (il sera recalculé)
- category: une valeur parmi [${categoryValues}], sinon "autres"
- payment_method: une valeur parmi [${paymentValues}] si le mode de paiement est visible, sinon "carte_bancaire"
- invoice_number: numéro de facture/ticket si présent
- description: courte description de l'achat
- ticket_location: emplacement du ticket dans l'image (ex: "haut-gauche", "centre", "page 2")
- confidence: ta confiance dans l'extraction, 0-100

Indices de plusieurs tickets : plusieurs logos/enseignes, plusieurs dates, plusieurs "TOTAL". Renvoie un tableau "receipts" avec un objet par ticket.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          receipts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                vendor: { type: "string" },
                date: { type: "string" },
                amount_ttc: { type: "number" },
                amount_ht: { type: "number" },
                vat_rate: { type: "number" },
                vat_amount: { type: "number" },
                category: { type: "string" },
                payment_method: { type: "string" },
                invoice_number: { type: "string" },
                description: { type: "string" },
                ticket_location: { type: "string" },
                confidence: { type: "number" },
              },
            },
          },
        },
      },
    });
    return result.receipts || [];
  };

  // Build a clean Receipt, reconciling amounts so HT + TVA = TTC.
  const buildReceipt = (raw, fileUrl, idx, count) => {
    const rate = VAT_RATES.includes(Number(raw.vat_rate)) ? Number(raw.vat_rate) : Number(raw.vat_rate) || 0;
    let ttc = Number(raw.amount_ttc) || 0;
    let ht = Number(raw.amount_ht) || 0;
    let vat;
    if (ttc > 0) {
      ht = ttc / (1 + rate / 100);
      vat = ttc - ht;
    } else if (ht > 0) {
      vat = (ht * rate) / 100;
      ttc = ht + vat;
    } else {
      vat = 0;
    }

    const category = CATEGORIES.some((c) => c.value === raw.category) ? raw.category : "autres";
    const payment = PAYMENT_METHODS.some((m) => m.value === raw.payment_method)
      ? raw.payment_method
      : "carte_bancaire";

    const notes = [
      raw.ticket_location ? `Emplacement : ${raw.ticket_location}` : "",
      count > 1 ? `Ticket ${idx + 1}/${count} du même document` : "",
      raw.confidence != null && raw.confidence < 70
        ? `⚠️ Confiance faible (${raw.confidence}%) — à vérifier`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      vendor: raw.vendor || "",
      description: raw.description || "",
      date: raw.date || "",
      amount_ht: round2(ht),
      vat_rate: rate,
      vat_amount: round2(vat),
      amount_ttc: round2(ttc),
      category,
      payment_method: payment,
      invoice_number: raw.invoice_number || "",
      notes,
      file_url: fileUrl,
      status: "en_attente",
    };
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: files.length });
    setResults([]);
    setErrors([]);

    const created = [];
    const errs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length });
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const extracted = await extractReceipts(file_url);
        if (extracted.length === 0) {
          errs.push({ name: file.name, error: "Aucun ticket détecté" });
          continue;
        }
        for (let j = 0; j < extracted.length; j++) {
          const data = buildReceipt(extracted[j], file_url, j, extracted.length);
          const saved = await base44.entities.Receipt.create(data);
          created.push(saved);
        }
      } catch (err) {
        console.error(`Erreur sur ${file.name}:`, err);
        errs.push({ name: file.name, error: err.message || "Échec du traitement" });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["receipts"] });
    setResults(created);
    setErrors(errs);
    setIsProcessing(false);

    if (created.length > 0) {
      toast({
        title: `${created.length} reçu(s) importé(s)`,
        description: "Statut : en attente de validation",
      });
    }
  };

  const totalTTC = results.reduce((s, r) => s + (r.amount_ttc || 0), 0);
  const totalVAT = results.reduce((s, r) => s + (r.vat_amount || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-3xl"
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">Importer des tickets</h1>
          <p className="text-sm text-muted-foreground">
            Uploadez un ou plusieurs documents — l'IA détecte chaque ticket et crée un reçu par ticket
          </p>
        </div>
      </div>

      {/* Upload zone */}
      {!isProcessing && results.length === 0 && errors.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="border-2 border-dashed rounded-lg p-10 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                onChange={handleFiles}
                className="hidden"
                id="bulk-upload"
                accept="image/*,application/pdf"
                multiple
              />
              <label htmlFor="bulk-upload" className="cursor-pointer">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium mt-3">
                  Cliquez pour choisir des fichiers
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Images ou PDF — plusieurs tickets par document acceptés
                </p>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
            <h3 className="text-base font-semibold mt-4">Traitement en cours…</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Extraction du fichier {progress.current} sur {progress.total}
            </p>
            <div className="h-2 bg-muted rounded-full mt-5 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!isProcessing && (results.length > 0 || errors.length > 0) && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mx-auto">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-center mt-4">Import terminé</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">
                {results.length} reçu(s) créé(s)
                {errors.length > 0 ? ` · ${errors.length} fichier(s) en échec` : ""}
              </p>

              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xl font-bold">{results.length}</p>
                  <p className="text-xs text-muted-foreground">Reçus</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xl font-bold">{totalTTC.toFixed(2)} €</p>
                  <p className="text-xs text-muted-foreground">Total TTC</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xl font-bold text-primary">{totalVAT.toFixed(2)} €</p>
                  <p className="text-xs text-muted-foreground">Total TVA</p>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="mt-5 p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      {errors.length} fichier(s) en échec
                    </span>
                  </div>
                  <ul className="text-xs text-red-600 space-y-0.5">
                    {errors.map((err, i) => (
                      <li key={i}>
                        {err.name} : {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-center gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResults([]);
                    setErrors([]);
                  }}
                >
                  Importer plus
                </Button>
                <Button onClick={() => navigate("/receipts")} className="gap-2">
                  Voir les reçus
                </Button>
              </div>
            </CardContent>
          </Card>

          {results.length > 0 && (
            <Card>
              <CardContent className="pt-6 divide-y">
                {results.map((r, i) => (
                  <div key={r.id || i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {r.vendor || "Fournisseur inconnu"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.date || "Date manquante"} · {VAT_RATES.includes(r.vat_rate) ? `${r.vat_rate}%` : "TVA ?"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold tabular-nums">
                        {(r.amount_ttc || 0).toFixed(2)} €
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        TVA {(r.vat_amount || 0).toFixed(2)} €
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </motion.div>
  );
}
