import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  PlusCircle,
  Search,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Archive,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

const statusConfig = {
  en_attente: { label: "En attente", className: "bg-amber-100 text-amber-800 border-amber-200" },
  valide: { label: "Validé", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rejete: { label: "Rejeté", className: "bg-red-100 text-red-800 border-red-200" },
  archive: { label: "Archivé", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

const categoryLabels = {
  fournitures: "Fournitures",
  transport: "Transport",
  services: "Services",
  restauration: "Restauration",
  logement: "Logement",
  telecommunication: "Télécom",
  assurance: "Assurance",
  marketing: "Marketing",
  entretien: "Entretien",
  energie: "Énergie",
  autres: "Autres",
};

export default function Receipts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: () => base44.entities.Receipt.list("-created_date", 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Receipt.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receipts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Receipt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      toast({ title: "Reçu supprimé" });
    },
  });

  const filtered = receipts.filter((r) => {
    const matchSearch =
      !search ||
      r.vendor?.toLowerCase().includes(search.toLowerCase()) ||
      r.invoice_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchCategory = categoryFilter === "all" || r.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Reçus</h1>
          <p className="text-sm text-muted-foreground">
            {receipts.length} reçu{receipts.length > 1 ? "s" : ""} au total
          </p>
        </div>
        <Link to="/add-receipt">
          <Button className="gap-2">
            <PlusCircle className="w-4 h-4" /> Nouveau reçu
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un fournisseur ou n° facture..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="valide">Validé</SelectItem>
                <SelectItem value="rejete">Rejeté</SelectItem>
                <SelectItem value="archive">Archivé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {Object.entries(categoryLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">HT</TableHead>
                <TableHead className="text-right">TVA</TableHead>
                <TableHead className="text-right">TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={i}>
                        {Array(8)
                          .fill(0)
                          .map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                          ))}
                      </TableRow>
                    ))
                : filtered.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{r.vendor}</p>
                          {r.invoice_number && (
                            <p className="text-xs text-muted-foreground">
                              {r.invoice_number}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.date && format(new Date(r.date), "d MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {categoryLabels[r.category] || r.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {(r.amount_ht || 0).toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {(r.vat_amount || 0).toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        {(r.amount_ttc || 0).toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${statusConfig[r.status]?.className || ""}`}
                        >
                          {statusConfig[r.status]?.label || r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                updateMutation.mutate({
                                  id: r.id,
                                  data: { status: "valide" },
                                })
                              }
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                              Valider
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateMutation.mutate({
                                  id: r.id,
                                  data: { status: "rejete" },
                                })
                              }
                            >
                              <XCircle className="w-4 h-4 mr-2 text-red-500" />
                              Rejeter
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateMutation.mutate({
                                  id: r.id,
                                  data: { status: "archive" },
                                })
                              }
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Archiver
                            </DropdownMenuItem>
                            {r.file_url && (
                              <DropdownMenuItem
                                onClick={() => window.open(r.file_url, "_blank")}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Voir le fichier
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(r.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Aucun reçu trouvé
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