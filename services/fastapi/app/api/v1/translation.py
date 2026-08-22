import os
import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas.translation import TranslationRequest, TranslationResponse

logger = logging.getLogger(__name__)
router = APIRouter()

def _translate_with_google_cloud(text: str, source_lang: str, target_lang: str) -> tuple[str, str]:
    """
    Attempt translation using google-cloud-translate or google-cloud-translate v2 if available.
    Returns (translated_text, provider_name).
    """
    # 1. Check for official Google Cloud Client library
    try:
        from google.cloud import translate_v2 as translate
        client = translate.Client()
        result = client.translate(text, target_language=target_lang, source_language=source_lang)
        if isinstance(result, dict) and "translatedText" in result:
            return result["translatedText"], "google-cloud-v2"
    except Exception as e:
        logger.debug(f"Google Cloud Translate V2 client initialization/call skipped: {e}")

    # 2. Check for Google Cloud v3 client library
    try:
        from google.cloud import translate_v3 as translate
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT_ID") or os.getenv("GCP_PROJECT_ID")
        if project_id:
            client = translate.TranslationServiceClient()
            parent = f"projects/{project_id}/locations/global"
            response = client.translate_text(
                request={
                    "parent": parent,
                    "contents": [text],
                    "mime_type": "text/plain",
                    "source_language_code": source_lang,
                    "target_language_code": target_lang,
                }
            )
            if response.translations:
                return response.translations[0].translated_text, "google-cloud-v3"
    except Exception as e:
        logger.debug(f"Google Cloud Translate V3 client skipped: {e}")

    # 3. Fallback when GCP credentials / API key not present
    # Return original text with fallback provider tag so system remains 100% operational without crashing
    logger.info("Google Cloud Translation API credentials not active. Using graceful fallback.")
    return text, "fallback-original"


@router.post("/translate", response_model=TranslationResponse, status_code=status.HTTP_200_OK)
async def translate_text(req: TranslationRequest):
    """
    POST /api/v1/translation/translate
    Translates input text dynamically using Google Cloud Translation API with zero credentials in frontend.
    """
    if not req.text or not req.text.strip():
        return TranslationResponse(
            translatedText="",
            sourceLanguage=req.sourceLanguage,
            targetLanguage=req.targetLanguage,
            provider="none"
        )

    if req.sourceLanguage.lower() == req.targetLanguage.lower():
        return TranslationResponse(
            translatedText=req.text,
            sourceLanguage=req.sourceLanguage,
            targetLanguage=req.targetLanguage,
            provider="identity"
        )

    try:
        translated_text, provider_used = _translate_with_google_cloud(
            req.text, req.sourceLanguage, req.targetLanguage
        )
        return TranslationResponse(
            translatedText=translated_text,
            sourceLanguage=req.sourceLanguage,
            targetLanguage=req.targetLanguage,
            provider=provider_used
        )
    except Exception as exc:
        logger.error(f"Error during translation request: {exc}")
        # Graceful failure fallback: return original text instead of throwing 500 error
        return TranslationResponse(
            translatedText=req.text,
            sourceLanguage=req.sourceLanguage,
            targetLanguage=req.targetLanguage,
            provider="error-fallback"
        )
