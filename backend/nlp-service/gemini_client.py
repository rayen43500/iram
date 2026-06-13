import os
from typing import Optional
import google.generativeai as genai

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


def _configured():
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def generate_answer(message: str, intent: str, context: dict) -> Optional[str]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(MODEL_NAME)

    user_name = context.get("userName") or "client"
    last_status = context.get("lastRequestStatus") or "aucune"
    credit_types = context.get("creditTypes") or []
    types_txt = ", ".join(credit_types[:8]) if credit_types else "Crédit SAYARA, Sakan, Mounassib, etc."

    system = f"""Tu es l'assistant virtuel de la Banque ATB (Arab Tunisian Bank), filiale tunisienne.
Réponds en français clair, ton professionnel et rassurant, maximum 100 mots.
Ne invente pas de taux ou montants précis. Oriente vers simulation ou agence si besoin.
Intention NLP détectée: {intent}
Client: {user_name}
Dernière demande de crédit: {last_status}
Produits disponibles: {types_txt}
"""

    prompt = f"{system}\n\nQuestion du client:\n{message.strip()}\n\nRéponse:"

    try:
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.35,
                "max_output_tokens": 280,
            },
        )
        text = (response.text or "").strip()
        return text or None
    except Exception as exc:
        print(f"[gemini] erreur: {exc}")
        return None
