const FALLBACK_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw1WZsVHzdQVi8NgasmXPy-TPKjSuvyN9cK__LSmp_aJnA7NJ9dktfeoAZNN-OqnOYM/exec";

function parseBody(req) {
  if (!req.body) {
    return {};
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Methode non autorisee." });
  }

  const appsScriptUrl =
    process.env.APPS_SCRIPT_URL || FALLBACK_APPS_SCRIPT_URL;

  if (!appsScriptUrl) {
    return res
      .status(500)
      .json({ message: "APPS_SCRIPT_URL non configuree sur le serveur." });
  }

  const payload = parseBody(req);

  try {
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = {};
    }

    if (!response.ok) {
      return res.status(response.status).json({
        message: json.message || "Echec de la transmission vers Google Script.",
      });
    }

    return res.status(200).json(
      json && typeof json === "object" && !Array.isArray(json)
        ? json
        : { ok: true, message: "Inscription envoyee avec succes." },
    );
  } catch {
    return res.status(502).json({
      message: "Impossible de joindre Google Script depuis le serveur.",
    });
  }
}
