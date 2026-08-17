"""Generate anime-styled portraits for the imported legendary heroes via Gemini Nano Banana.
Saves PNGs into frontend/public/heroes/<id>.png. Skips existing. Run: python scripts/gen_heroes.py
"""
import asyncio
import base64
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
load_dotenv(Path(__file__).resolve().parents[1] / "backend" / ".env")

from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402
import game_data as gd  # noqa: E402

API_KEY = os.getenv("EMERGENT_LLM_KEY")
MODEL = "gemini-3.1-flash-image-preview"
HERO_DIR = Path(__file__).resolve().parents[1] / "frontend" / "public" / "heroes"
HERO_DIR.mkdir(parents=True, exist_ok=True)

ELEMENT_THEME = {
    "Fire": "crimson and molten gold, ember sparks, volcanic heat haze",
    "Water": "deep ocean teal and pearl white, flowing water ribbons, aquamarine glow",
    "Earth": "emerald and amber, living vines and stone, golden pollen particles",
    "Wind": "electric violet and silver, swirling cyclone, crackling storm energy",
    "Light": "radiant celestial gold and ivory, divine halo, volumetric god rays",
    "Dark": "deep violet and midnight black, void tendrils, glowing runes, crescent moon",
}
RARITY_QUALITY = {
    "R": "detailed anime character art",
    "SR": "highly detailed fantasy anime character, dramatic lighting",
    "SSR": "premium gacha game splash art, ultra-detailed costume, cinematic lighting",
    "UR": "masterpiece premium gacha art, ornate divine costume, epic cinematic lighting",
    "LR": "masterpiece, godlike divine deity, otherworldly beauty, radiant cosmic aura, epic",
}


async def gen_one(sem, hero):
    out_path = HERO_DIR / f"{hero['id']}.png"
    if out_path.exists():
        print(f"skip {out_path.name}")
        return
    theme = ELEMENT_THEME.get(hero["element"], "")
    quality = RARITY_QUALITY.get(hero["rarity"], "")
    prompt = (
        f"Anime style character portrait of an original fictional warrior deity inspired by the concept '{hero['title']}'. "
        f"A {hero['role'].lower()} of the {hero['element']} element: {hero['lore']} "
        f"Color theme: {theme}. {quality}. Dynamic heroic three-quarter pose, elaborate fantasy armor and flowing cloth, "
        "glowing eyes, vibrant cel-shaded anime art, dramatic rim lighting, dark moody background, "
        "trading card game splash art, highly detailed, centered, no text, no watermark. "
        "Completely original character, not resembling any real person or existing franchise."
    )
    async with sem:
        for attempt in range(3):
            try:
                chat = LlmChat(api_key=API_KEY, session_id=f"hero-{hero['id']}-{attempt}",
                               system_message="You are an expert anime concept artist.")
                chat.with_model("gemini", MODEL).with_params(modalities=["image", "text"])
                _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
                if images:
                    out_path.write_bytes(base64.b64decode(images[0]["data"]))
                    print(f"saved {out_path.name}")
                    return
            except Exception as e:
                print(f"err {hero['id']}: {str(e)[:100]}")
            await asyncio.sleep(2)
        print(f"FAILED {hero['id']}")


async def main():
    heroes = [n for n in gd.NINJA_CATALOG if n["portrait"].startswith("/heroes")]
    sem = asyncio.Semaphore(4)
    await asyncio.gather(*[gen_one(sem, h) for h in heroes])
    print("DONE")


if __name__ == "__main__":
    asyncio.run(main())
