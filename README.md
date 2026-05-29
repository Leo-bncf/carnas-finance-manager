# carnas-finance-manager

> Gestionnaire de reçus et de TVA pour **Carnas**. Saisie manuelle ou upload de justificatifs, suivi des dépenses par catégorie, et export des déclarations TVA par année.

---

## C'est quoi ?

Une web app interne pour gérer les reçus et notes de frais de Carnas. On entre une dépense (montant HT, taux de TVA, catégorie, mode de paiement), on attache le justificatif, et l'app calcule automatiquement TVA et TTC. La page **Rapport TVA** agrège tout par taux pour faciliter la déclaration fiscale.

Cinq pages : **Dashboard → Reçus → Ajouter → Rapport TVA → Paramètres**.

---

## Fonctionnalités

- 🧾 **Saisie de reçus** — vendor, description, date, montant HT/TVA/TTC, catégorie, mode de paiement, numéro de facture
- 📎 **Upload de justificatif** — fichier attaché à chaque reçu (URL stockée)
- 📊 **Dashboard** — stats globales + graphe mensuel des dépenses + répartition par catégorie (Recharts)
- 🏷️ **Statuts** — `en_attente → validé → rejeté → archivé`
- 🧮 **Rapport TVA** — agrégation par taux (0%, 2.1%, 5.5%, 10%, 20%), filtrable par année, export XLSX
- 🔐 **Auth** — login / register / mot de passe oublié / reset, routes protégées

---

## Pages

| Route | Description |
|---|---|
| `/Dashboard` | KPIs, graphe mensuel, répartition catégories, reçus récents |
| `/Receipts` | Liste complète avec filtres et gestion des statuts |
| `/AddReceipt` | Formulaire de saisie avec calcul TVA automatique |
| `/VatReport` | Rapport TVA annuel par taux, export XLSX |
| `/Settings` | Paramètres utilisateur |

---

## Modèle de données — `Receipt`

| Champ | Type | Description |
|---|---|---|
| `vendor` | string | Nom du fournisseur (**requis**) |
| `date` | date | Date du reçu (**requis**) |
| `amount_ht` | number | Montant hors taxes |
| `vat_rate` | number | Taux de TVA (0 / 2.1 / 5.5 / 10 / 20) |
| `vat_amount` | number | Montant TVA calculé |
| `amount_ttc` | number | Montant TTC (**requis**) |
| `category` | enum | fournitures, transport, services, restauration, logement… |
| `payment_method` | enum | carte_bancaire, espèces, virement, chèque, prélèvement |
| `status` | enum | `en_attente` \| `validé` \| `rejeté` \| `archivé` |
| `invoice_number` | string | Numéro de facture |
| `file_url` | string | URL du justificatif uploadé |
| `notes` | string | Notes additionnelles |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite |
| UI | Tailwind CSS, shadcn/ui, Radix UI, Framer Motion |
| Backend / Auth | Base44 SDK |
| Charts | Recharts |
| Export | xlsx |
| Forms | React Hook Form, Zod |
| State | TanStack Query |

---

## Quick Start

```bash
git clone https://github.com/Leo-bncf/carnas-finance-manager
cd carnas-finance-manager

npm install

cp .env.example .env.local
# → VITE_BASE44_APP_ID=your_app_id
# → VITE_BASE44_APP_BASE_URL=your_backend_url

npm run dev
# → http://localhost:5173
```

---

*Outil interne — Carnas*
