import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const app = express();
const PORT = 3001;
const DOWNLOAD_TOKEN = process.env.DOWNLOAD_TOKEN;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const excelPath = path.join(dataDir, "participants.xlsx");

app.use(cors());
app.use(express.json());

function readBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return "";
}

function isAuthorized(req) {
  if (!DOWNLOAD_TOKEN) {
    return false;
  }
  const bearerToken = readBearerToken(req);
  const queryToken = typeof req.query.token === "string" ? req.query.token : "";
  return bearerToken === DOWNLOAD_TOKEN || queryToken === DOWNLOAD_TOKEN;
}

function ensureWorkbook() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(excelPath)) {
    const workbook = XLSX.utils.book_new();
    const headers = [
      [
        "Date inscription",
        "Nom",
        "Prenom",
        "Profession",
        "Telephone",
        "Email",
        "Premiere participation",
        "Experience editions passees",
        "Presence confirmee",
      ],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(workbook, sheet, "Participants");
    XLSX.writeFile(workbook, excelPath);
  }
}

function appendRowToWorkbook(row) {
  ensureWorkbook();
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  rows.push(row);
  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rows);
  XLSX.writeFile(workbook, excelPath);
}

app.post("/api/inscriptions", (req, res) => {
  const {
    nom,
    prenom,
    profession,
    telephone,
    email,
    premiereParticipation,
    experience,
    presenceConfirmee,
  } = req.body;

  if (
    !nom ||
    !prenom ||
    !profession ||
    !telephone ||
    !email ||
    !premiereParticipation ||
    !presenceConfirmee
  ) {
    return res.status(400).json({ message: "Champs obligatoires manquants." });
  }

  if (premiereParticipation === "non" && !experience) {
    return res.status(400).json({
      message:
        "Veuillez renseigner votre experience des editions passees.",
    });
  }

  const row = [
    new Date().toISOString(),
    nom,
    prenom,
    profession,
    telephone,
    email,
    premiereParticipation === "oui" ? "Oui" : "Non",
    experience || "",
    presenceConfirmee ? "Oui" : "Non",
  ];

  try {
    appendRowToWorkbook(row);
    return res.status(201).json({
      message: "Inscription enregistree avec succes.",
      file: excelPath,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur lors de l'enregistrement Excel." });
  }
});

app.get("/api/inscriptions/fichier", (req, res) => {
  if (!DOWNLOAD_TOKEN) {
    return res.status(500).json({
      message:
        "Variable d'environnement DOWNLOAD_TOKEN absente. Configurez-la sur le serveur.",
    });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ message: "Acces non autorise." });
  }

  ensureWorkbook();
  return res.download(excelPath);
});

app.listen(PORT, () => {
  ensureWorkbook();
  console.log(`Serveur inscriptions demarre sur http://localhost:${PORT}`);
});
