"""
Microservice NLP + Gemini pour le chatbot ATB.
Lancer: uvicorn app:app --host 127.0.0.1 --port 5001 --reload
"""

import os
from typing import Optional, List
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel, Field

from nlp_intents import IntentClassifier
from gemini_client import generate_answer, _configured

load_dotenv()

app = FastAPI(title="ATB NLP Chat Service", version="1.0.0")
classifier = IntentClassifier()


class ChatContext(BaseModel):
    userName: str = ""
    lastRequestStatus: Optional[str] = None
    creditTypes: List[str] = Field(default_factory=list)
    salary: Optional[float] = None


class ChatRequest(BaseModel):
    message: str
    context: ChatContext = Field(default_factory=ChatContext)


RULE_ANSWERS = {
    "documents": (
        "Pour un dossier crédit ATB, préparez généralement : CIN, fiche de paie récente, "
        "relevés bancaires et justificatif de domicile. Vous pouvez les déposer dans Profil → Documents."
    ),
    "request_status": "Consultez l’onglet Accueil pour vos demandes récentes ou demandez le statut de votre dernière demande.",
    "simulation_help": (
        "Allez dans Simulation : choisissez le type de crédit, saisissez salaire, montant et durée, "
        "puis calculez l’estimation avant de soumettre le formulaire ATB."
    ),
    "credit_types": "ATB propose crédits auto (SAYARA), immobilier (Sakan), consommation (Mounassib), rachat (Tahawel), rénovation, etc.",
    "greeting": "Bonjour ! Je suis l’assistant ATB. Je peux vous aider sur les crédits, documents, simulation et suivi de demande.",
    "contact": "Rendez-vous en agence ATB ou contactez votre conseiller. Horaires : lun–ven 8h30–16h30.",
    "general": "Je peux vous orienter sur les types de crédit, les documents, la simulation et le statut de votre demande.",
}


def rule_answer(intent: str, ctx: ChatContext) -> str:
    if intent == "request_status" and ctx.lastRequestStatus:
        labels = {
            "pending": "en attente de traitement",
            "accepted": "acceptée",
            "rejected": "refusée",
        }
        st = labels.get(ctx.lastRequestStatus, ctx.lastRequestStatus)
        return f"Votre dernière demande de crédit est {st}. Consultez Accueil pour le détail."
    return RULE_ANSWERS.get(intent, RULE_ANSWERS["general"])


@app.get("/health")
def health():
    return {
        "ok": True,
        "gemini": _configured(),
        "model": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
    }


@app.post("/chat")
def chat(body: ChatRequest):
    message = (body.message or "").strip()
    if not message:
        return {
            "answer": "Bonjour ! Posez votre question sur les crédits ATB.",
            "intent": "greeting",
            "confidence": 1.0,
            "source": "rules",
        }

    intent, confidence = classifier.predict(message)
    ctx = body.context

    answer = None
    source = "rules"

    if _configured():
        answer = generate_answer(message, intent, ctx.model_dump())
        if answer:
            source = "gemini"

    if not answer:
        answer = rule_answer(intent, ctx)
        source = "nlp" if confidence >= 0.2 else "rules"

    return {
        "answer": answer,
        "intent": intent,
        "confidence": round(confidence, 3),
        "source": source,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("NLP_PORT", "5001"))
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=True)
