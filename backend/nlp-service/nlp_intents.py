"""Classification d'intentions — NLP léger sans dépendance lourde (mots-clés + similarité)."""

import re
import unicodedata

INTENT_EXAMPLES = {
    "documents": [
        "quels documents faut il fournir pour le credit",
        "cin fiche de paie releve bancaire justificatif",
        "papiers necessaires dossier credit upload",
    ],
    "request_status": [
        "statut de ma demande de credit",
        "ou en est mon dossier suivi",
        "demande acceptee ou refusee en attente",
    ],
    "simulation_help": [
        "comment faire une simulation de credit",
        "calculer mensualite montant duree salaire",
        "estimation probabilite acceptation simuler pret",
    ],
    "credit_types": [
        "types de credit sayara sakan mounassib tahawel",
        "credit auto immobilier consommation atb",
        "quels produits credit propose la banque",
    ],
    "greeting": [
        "bonjour salam labes bonsoir",
        "hello coucou merci",
    ],
    "contact": [
        "contacter agence telephone support conseiller",
        "horaires agence atb rendez vous",
    ],
}

KEYWORD_INTENTS = {
    "documents": ["document", "cin", "passeport", "fiche", "paie", "releve", "justificatif", "selfie", "upload", "papier"],
    "request_status": ["statut", "status", "suivi", "dossier", "accept", "refus", "pending", "attente", "demande"],
    "simulation_help": ["simul", "estim", "mensual", "montant", "duree", "salaire", "calcul", "emprunt"],
    "credit_types": ["sayara", "sakan", "mounassib", "tahawel", "renov", "start", "type de credit", "produit", "vehicule", "immobilier"],
    "greeting": ["bonjour", "salam", "bonsoir", "hello", "labes", "merci", "ahlan"],
    "contact": ["agence", "conseiller", "telephone", "support", "contacter", "horaire"],
}


def normalize(text: str) -> str:
    text = (text or "").lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _tokens(text: str):
    return set(normalize(text).split())


def _overlap_score(query: str, phrase: str) -> float:
    q = _tokens(query)
    p = _tokens(phrase)
    if not q or not p:
        return 0.0
    inter = len(q & p)
    return inter / max(len(q), 1)


class IntentClassifier:
    """NLP simple : score mots-clés + recouvrement lexical."""

    def predict(self, message: str):
        norm = normalize(message)
        if not norm:
            return "greeting", 0.0

        scores = {intent: 0.0 for intent in KEYWORD_INTENTS}

        for intent, keys in KEYWORD_INTENTS.items():
            for key in keys:
                if key in norm:
                    scores[intent] += 2.0 if len(key) > 4 else 1.0

        for intent, examples in INTENT_EXAMPLES.items():
            for ex in examples:
                scores[intent] = max(scores[intent], _overlap_score(norm, ex) * 3.0)

        best_intent = max(scores, key=scores.get)
        best_score = scores[best_intent]

        if best_score < 0.5:
            return "general", 0.2

        confidence = min(0.98, 0.35 + best_score * 0.12)
        return best_intent, confidence
