import { useState } from 'react'
import './App.css'

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbw1WZsVHzdQVi8NgasmXPy-TPKjSuvyN9cK__LSmp_aJnA7NJ9dktfeoAZNN-OqnOYM/exec'
const INSCRIPTIONS_KEY = 'cojerf_inscriptions_uniques'

function nettoyerTelephone(telephone) {
  return telephone.replace(/\D/g, '')
}

function nomValide(valeur) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}$/.test(valeur)
}

function emailValide(valeur) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valeur)
}

function telephoneValide(valeur) {
  const chiffres = nettoyerTelephone(valeur)
  return chiffres.length >= 8 && chiffres.length <= 15
}

function lireInscriptionsLocales() {
  const brut = localStorage.getItem(INSCRIPTIONS_KEY)
  if (!brut) return []
  try {
    const parse = JSON.parse(brut)
    return Array.isArray(parse) ? parse : []
  } catch {
    return []
  }
}

function App() {
  const [premiereParticipation, setPremiereParticipation] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [message, setMessage] = useState('')
  const [typeMessage, setTypeMessage] = useState('')

  async function gererSoumission(event) {
    event.preventDefault()
    const formulaire = event.currentTarget
    const donnees = new FormData(formulaire)

    const payload = {
      nom: donnees.get('nom')?.toString().trim() || '',
      prenom: donnees.get('prenom')?.toString().trim() || '',
      profession: donnees.get('profession')?.toString().trim() || '',
      telephone: donnees.get('telephone')?.toString().trim() || '',
      email: donnees.get('email')?.toString().trim() || '',
      premiereParticipation: donnees.get('premiereParticipation') || '',
      experience: donnees.get('experience')?.toString().trim() || '',
      presenceConfirmee: Boolean(donnees.get('presenceConfirmee')),
    }
    const idUnique = `${payload.email.toLowerCase()}|${nettoyerTelephone(
      payload.telephone,
    )}`

    if (!nomValide(payload.nom)) {
      setTypeMessage('erreur')
      setMessage('Nom invalide. Utilisez uniquement des lettres.')
      return
    }

    if (!nomValide(payload.prenom)) {
      setTypeMessage('erreur')
      setMessage('Prenom invalide. Utilisez uniquement des lettres.')
      return
    }

    if (!telephoneValide(payload.telephone)) {
      setTypeMessage('erreur')
      setMessage('Telephone invalide. Entrez entre 8 et 15 chiffres.')
      return
    }

    if (!emailValide(payload.email)) {
      setTypeMessage('erreur')
      setMessage('Adresse email invalide.')
      return
    }

    const inscriptionsLocales = lireInscriptionsLocales()
    if (inscriptionsLocales.includes(idUnique)) {
      setTypeMessage('erreur')
      setMessage(
        'Cette personne est deja inscrite avec cet email et ce telephone.',
      )
      return
    }

    try {
      setEnvoiEnCours(true)
      setMessage('')
      setTypeMessage('')

      const reponse = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      })
      const texteReponse = await reponse.text()
      let resultat = {}
      try {
        resultat = JSON.parse(texteReponse)
      } catch {
        resultat = {}
      }

      if (!reponse.ok) {
        throw new Error(
          resultat.message || "Echec de l'enregistrement vers Google Sheets.",
        )
      }

      formulaire.reset()
      setPremiereParticipation('')
      localStorage.setItem(
        INSCRIPTIONS_KEY,
        JSON.stringify([...inscriptionsLocales, idUnique]),
      )
      setTypeMessage('succes')
      setMessage(
        resultat.message ||
          'Inscription enregistree avec succes dans Google Sheets.',
      )
    } catch (error) {
      setTypeMessage('erreur')
      setMessage(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de l'enregistrement.",
      )
    } finally {
      setEnvoiEnCours(false)
    }
  }

  return (
    <main className="page">
      <section className="card">
        <div className="entete">
          <img className="logo-cojerf" src="/logo-cojerf.png" alt="Logo COJERF" />
        </div>
        <p className="badge">COJERF - Journee Educative</p>
        <h1>Inscription a l'evenement</h1>
        <p className="intro">
          Merci de remplir ce formulaire pour confirmer votre participation.
        </p>

        <form className="formulaire" onSubmit={gererSoumission}>
          <div className="grille-champs">
            <div className="champ">
              <label htmlFor="nom">Nom</label>
              <input
                id="nom"
                name="nom"
                type="text"
                required
                minLength="2"
                maxLength="60"
                pattern="[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}"
              />
            </div>

            <div className="champ">
              <label htmlFor="prenom">Prenom</label>
              <input
                id="prenom"
                name="prenom"
                type="text"
                required
                minLength="2"
                maxLength="60"
                pattern="[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}"
              />
            </div>

            <div className="champ">
              <label htmlFor="profession">Profession</label>
              <input id="profession" name="profession" type="text" required />
            </div>

            <div className="champ">
              <label htmlFor="telephone">Telephone</label>
              <input
                id="telephone"
                name="telephone"
                type="tel"
                required
                inputMode="tel"
                minLength="8"
                maxLength="20"
                pattern="[0-9\\s()+-]{8,20}"
              />
            </div>

            <div className="champ pleine-largeur">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required maxLength="120" />
            </div>
          </div>

          <fieldset className="champ pleine-largeur">
            <legend>
              Est-ce votre premiere participation a notre journee educative ?
            </legend>
            <div className="choix-inline">
              <label>
                <input
                  type="radio"
                  name="premiereParticipation"
                  value="oui"
                  required
                  checked={premiereParticipation === 'oui'}
                  onChange={(event) =>
                    setPremiereParticipation(event.target.value)
                  }
                />
                Oui
              </label>
              <label>
                <input
                  type="radio"
                  name="premiereParticipation"
                  value="non"
                  checked={premiereParticipation === 'non'}
                  onChange={(event) =>
                    setPremiereParticipation(event.target.value)
                  }
                />
                Non
              </label>
            </div>
          </fieldset>

          {premiereParticipation === 'non' && (
            <div className="champ conditionnel pleine-largeur">
              <label htmlFor="experience">
                Si non, partagez votre experience des editions passees en une
                phrase.
              </label>
              <textarea
                id="experience"
                name="experience"
                rows="3"
                placeholder="Exemple : J'ai beaucoup appris grace aux ateliers."
                required
              />
            </div>
          )}

          <label className="confirmation">
            <input type="checkbox" name="presenceConfirmee" required />
            Oui, j'accepte et je confirme ma presence
          </label>

          <button type="submit" disabled={envoiEnCours}>
            {envoiEnCours ? 'Envoi en cours...' : "Envoyer l'inscription"}
          </button>

          {message && <p className={`message ${typeMessage}`}>{message}</p>}
        </form>
      </section>
    </main>
  )
}

export default App
