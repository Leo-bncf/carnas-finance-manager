import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Upload, Save, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

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

export default function AddReceipt() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    vendor: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    amount_ht: "",
    vat_rate: 20,
    vat_amount: "",
    amount_ttc: "",
    category: "autres",
    payment_method: "carte_bancaire",
    invoice_number: "",
    notes: "",
    file_url: "",
  });

  const set = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "amount_ht" || field === "vat_rate") {
        const ht = field === "amount_ht" ? parseFloat(value) || 0 : parseFloat(next.amount_ht) || 0;
        const rate = field === "vat_rate" ? parseFloat(value) || 0 : parseFloat(next.vat_rate) || 0;
        next.vat_amount = ((ht * rate) / 100).toFixed(2);
        next.amount_ttc = (ht + parseFloat(next.vat_amount)).toFixed(2);
      }

      if (field === "amount_ttc") {
        const ttc = parseFloat(value) || 0;
        const rate = parseFloat(next.vat_rate) || 0;
        const ht = ttc / (1 + rate / 100);
        next.amount_ht = ht.toFixed(2);
        next.vat_amount = (ttc - ht).toFixed(2);
      }

      return next;
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("file_url", file_url);
    setUploading(false);
    toast({ title: "Fichier uploadé", description: file.name });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Receipt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast({ title: "Reçu ajouté avec succès" });
      navigate("/receipts");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      amount_ht: parseFloat(form.amount_ht) || 0,
      vat_rate: parseFloat(form.vat_rate) || 0,
      vat_amount: parseFloat(form.vat_amount) || 0,
      amount_ttc: parseFloat(form.amount_ttc) || 0,
      status: "en_attente",
    });
  };

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
          <h1 className="text-2xl font-display font-bold">Ajouter un reçu</h1>
          <p className="text-sm text-muted-foreground">
            Renseignez les informations de votre reçu
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Infos principales */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Informations principales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fournisseur *</Label>
              <Input
                value={form.vendor}
                onChange={(e) => set("vendor", e.target.value)}
                placeholder="Nom du fournisseur"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>N° de facture</Label>
              <Input
                value={form.invoice_number}
                onChange={(e) => set("invoice_number", e.target.value)}
                placeholder="FAC-0001"
              />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Détails de la dépense..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Montants */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Montants & TVA</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Montant HT (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount_ht}
                onChange={(e) => set("amount_ht", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Taux de TVA (%)</Label>
              <Select
                value={String(form.vat_rate)}
                onValueChange={(v) => set("vat_rate", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAT_RATES.map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Montant TVA (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.vat_amount}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Montant TTC (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount_ttc}
                onChange={(e) => set("amount_ttc", e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select
                value={form.payment_method}
                onValueChange={(v) => set("payment_method", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Fichier & Notes */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Pièce jointe & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fichier du reçu</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,application/pdf"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 mx-auto text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {form.file_url
                      ? "Fichier uploadé ✓"
                      : "Cliquez pour uploader un fichier"}
                  </p>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Notes additionnelles..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" disabled={createMutation.isPending} className="gap-2">
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Enregistrer
          </Button>
        </div>
      </form>
    </motion.div>
  );
}