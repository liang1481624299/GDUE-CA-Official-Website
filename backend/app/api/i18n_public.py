"""i18n 字典公开接口（示例新壳接口；数据库化在后续 /plan 中落地）。

GET /api/i18n/{lang_code}
    → {
        code: 0,
        msg: "ok",
        data: {
          revision: 0,                  # 数据库化后会随翻译变更自增
          lang: "zh-CN",
          translations: { ... }          # 当前阶段留空，等待 i18n 模块填充
        },
        request_id: "..."
      }

注意：当前阶段只搭壳，不查数据库；前端按现有静态 messages/* JSON 工作。
后续模块（i18n 数据库化）接管后，本接口将返回数据库中的 revision + translations。
"""
from fastapi import APIRouter, Path

from app.core.responses import ok

router = APIRouter(prefix="/api/i18n", tags=["i18n"])


@router.get("/{lang_code}")
async def get_i18n_dict(
    lang_code: str = Path(..., min_length=2, max_length=10, description="语言代码：zh-CN/zh-TW/en/ja"),
):
    # 业务模块未来要做的：查 i18n_key / i18n_translation 两表，按 lang_code 拼字典
    return ok(
        data={
            "revision": 0,
            "lang": lang_code,
            "translations": {},
            "_placeholder": True,
        }
    )