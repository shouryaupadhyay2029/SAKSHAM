from pydantic import BaseModel, Field
from typing import Optional

class TranslationRequest(BaseModel):
    text: str = Field(..., description="Text content to be translated")
    sourceLanguage: str = Field(default="en", description="Source language ISO code (e.g. en, hi)")
    targetLanguage: str = Field(default="hi", description="Target language ISO code (e.g. hi, en, bn)")

class TranslationResponse(BaseModel):
    translatedText: str = Field(..., description="Translated text content")
    sourceLanguage: str = Field(..., description="Source language ISO code")
    targetLanguage: str = Field(..., description="Target language ISO code")
    provider: Optional[str] = Field(default="google", description="Translation engine provider used")
