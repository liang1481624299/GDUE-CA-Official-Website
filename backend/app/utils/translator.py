"""表单内容自动翻译服务。

- 语言检测：日文假名 -> ja；汉字 -> zh-CN；其他 -> en
- 翻译源：Google translate gtx（免费无 key）优先，MyMemory 兜底
- 缓存：TranslationCache 表，避免重复调用外部接口
"""
import hashlib
import logging
import re

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import TranslationCache

logger = logging.getLogger("gdueca.translator")

SUPPORTED_LANGS = {"zh-CN", "zh-TW", "en", "ja"}

# 前端语言路由拆分后，翻译目标语言归一化（翻译服务不区分英语/繁体区域变体）
_LANG_ALIASES = {"en-US": "en", "en-GB": "en", "zh-HK": "zh-TW"}


def normalize_lang(lang: str) -> str:
    """区域变体归一化：en-US / en-GB → en（翻译服务不区分英语区域变体）。"""
    return _LANG_ALIASES.get(lang, lang)

_GTX_URL = "https://translate.googleapis.com/translate_a/single"
_MYMEMORY_URL = "https://api.mymemory.translated.net/get"


def detect_lang(text: str) -> str:
    """简单启发式语言检测。"""
    if not text:
        return "zh-CN"
    if re.search(r"[\u3040-\u30ff]", text):  # 平假名/片假名
        return "ja"
    if re.search(r"[\u4e00-\u9fff]", text):  # 汉字（繁体不做区分，按简体处理）
        return "zh-CN"
    if re.search(r"[\uac00-\ud7af]", text):  # 谚文
        return "ko"
    return "en"


async def _translate_google(text: str, target_lang: str) -> str:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            _GTX_URL,
            params={"client": "gtx", "sl": "auto", "tl": target_lang, "dt": "t", "q": text},
        )
        resp.raise_for_status()
        data = resp.json()
        return "".join(seg[0] for seg in data[0] if seg and seg[0])


async def _translate_mymemory(text: str, source_lang: str, target_lang: str) -> str:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            _MYMEMORY_URL,
            params={"q": text, "langpair": f"{source_lang}|{target_lang}"},
        )
        resp.raise_for_status()
        data = resp.json()
        return (data.get("responseData") or {}).get("translatedText", "")


async def translate_text(
    db: AsyncSession,
    text: str,
    target_lang: str,
    source_lang: str | None = None,
) -> str | None:
    """翻译单条文本；语言相同/翻译失败返回 None（调用方回退显示原文）。"""
    if not text or not text.strip():
        return None
    target_lang = normalize_lang(target_lang)
    if target_lang not in SUPPORTED_LANGS:
        return None

    sl = normalize_lang(source_lang or detect_lang(text))
    if sl == target_lang:
        return None

    # 命中缓存直接返回
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    cached = await db.execute(
        select(TranslationCache).where(
            TranslationCache.source_hash == h,
            TranslationCache.source_lang == sl,
            TranslationCache.target_lang == target_lang,
        )
    )
    row = cached.scalar_one_or_none()
    if row:
        return row.translated_text

    # 调用外部翻译（gtx 优先，MyMemory 兜底）
    translated: str | None = None
    try:
        translated = await _translate_google(text, target_lang)
    except Exception as e:
        logger.warning("Google 翻译失败，改用 MyMemory：%s", e.__class__.__name__)
        try:
            translated = await _translate_mymemory(text, sl, target_lang)
        except Exception as e2:
            logger.warning("MyMemory 翻译失败，返回原文：%s", e2.__class__.__name__)
            return None

    if translated and translated.strip() and translated.strip() != text.strip():
        db.add(TranslationCache(
            source_hash=h,
            source_lang=sl,
            target_lang=target_lang,
            source_text=text[:2000],
            translated_text=translated,
        ))
        return translated
    return None
