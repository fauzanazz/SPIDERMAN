import asyncio
import json
from dotenv import load_dotenv
load_dotenv()
from browser_use import Agent, Controller
from browser_use.llm import ChatGoogle
from config import get_extraction_instruction, generate_random_identity
from model import GamblingSiteData

def base64_to_image(base64_string: str, output_filename: str):
    """Convert base64 string to image."""
    import base64
    import os

    if not os.path.exists(os.path.dirname(output_filename)):
        os.makedirs(os.path.dirname(output_filename))

    img_data = base64.b64decode(base64_string)
    with open(output_filename, "wb") as f:
        f.write(img_data)
    return output_filename

async def main():
    # Generate multiple random identities for the extraction task
    identities = [generate_random_identity() for _ in range(1)]
    # Add famous Indonesian banks as discovered payment methods
    famous_banks = ["BCA", "BRI", "BNI", "Mandiri", "CIMB Niaga", "Danamon", "OVO", "GoPay", "DANA"]
    extraction_instruction = get_extraction_instruction(identities, famous_banks)
    controller = Controller(output_model=GamblingSiteData)
    agent = Agent(
        task=f"Navigate to https://arab19.sbs/ and {extraction_instruction}",
        llm=ChatGoogle(model="gemini-2.5-flash"),
        controller=controller,
    )
    result = await agent.run()
    screenshots = result.screenshots()
    number_screenshots = 0
    for next_screenshot in screenshots:
        number_screenshots = number_screenshots + 1
        path = f"./screenshots/{number_screenshots}.png"
        img_path = base64_to_image(
            base64_string=str(next_screenshot),
            output_filename=path
        )
    print(img_path)

    final = result.final_result()
    # result_json =  extract_json_from_text(result.final_result())
    parsed: GamblingSiteData = GamblingSiteData.model_validate_json(final)
    print(parsed)

asyncio.run(main())

