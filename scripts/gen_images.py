"""One-off script to generate fictional anime ninja portraits + scene art via Gemini Nano Banana.
Saves PNGs into the frontend public folder so they are served statically.
Skips any image that already exists. Run: python scripts/gen_images.py
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
NINJA_DIR = Path(__file__).resolve().parents[1] / "frontend" / "public" / "ninjas"
ART_DIR = Path(__file__).resolve().parents[1] / "frontend" / "public" / "art"
NINJA_DIR.mkdir(parents=True, exist_ok=True)
ART_DIR.mkdir(parents=True, exist_ok=True)

ELEMENT_DESC = {
    "Fire": "glowing crimson and orange flames, ember sparks",
    "Water": "swirling blue water and ice crystals",
    "Wind": "swirling green-white wind gusts and floating leaves",
    "Earth": "brown rocky armor and stone shards",
    "Lightning": "crackling yellow electricity and sparks",
    "Dark": "purple-black shadow tendrils and a sinister aura",
    "Light": "radiant golden light and glowing halos",
}


async def gen_one(sem, sched):
    prompt, out_path = sched
    if out_path.exists():
        print(f"skip exists {out_path.name}")
        return
    async with sem:
        for attempt in range(3):
            try:
                chat = LlmChat(api_key=API_KEY, session_id=f"img-{out_path.stem}-{attempt}",
                               system_message="You are an expert anime concept artist.")
                chat.with_model("gemini", MODEL).with_params(modalities=["image", "text"])
                _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
                if images:
                    out_path.write_bytes(base64.b64decode(images[0]["data"]))
                    print(f"saved {out_path.name}")
                    return
                print(f"no image returned for {out_path.name}, retry")
            except Exception as e:
                print(f"error {out_path.name}: {str(e)[:120]}")
            await asyncio.sleep(2)
        print(f"FAILED {out_path.name}")


async def main():
    schedule = []
    for n in gd.NINJA_CATALOG:
        desc = ELEMENT_DESC[n["element"]]
        prompt = (
            f"Anime style character portrait of an original fictional ninja warrior named concept '{n['title']}'. "
            f"A {n['role'].lower()} shinobi themed around the {n['element']} element with {desc}. "
            "Dynamic heroic three-quarter pose, detailed ninja outfit with headband and scarf, "
            "vibrant cel-shaded anime art, dramatic rim lighting, dark moody background, "
            "trading card game splash art, highly detailed, centered, no text, no watermark. "
            "Completely original character, not resembling any existing franchise."
        )
        schedule.append((prompt, NINJA_DIR / f"{n['id']}.png"))

    schedule.append((
        "Anime style epic landscape of a hidden ninja village at night under a huge moon, "
        "pagoda rooftops, glowing lanterns, mountains, cinematic, cel-shaded, atmospheric, no text.",
        ART_DIR / "login-hero.png",
    ))
    schedule.append((
        "Anime style empty battle arena at dusk, a rocky clearing in a misty bamboo forest, "
        "dramatic sky, wide cinematic establishing shot, cel-shaded, no characters, no text.",
        ART_DIR / "battle-bg.png",
    ))

    sem = asyncio.Semaphore(3)
    await asyncio.gather(*[gen_one(sem, s) for s in schedule])
    print("DONE")


if __name__ == "__main__":
    asyncio.run(main())
