import asyncio
import json
from dotenv import load_dotenv
load_dotenv()
from browser_use import Agent, Controller
from browser_use.llm import ChatGoogle
from config import get_extraction_instruction, generate_random_identity
from model import GamblingSiteData

async def main():
    # Generate a random identity for the extraction task
    identity = generate_random_identity()
    extraction_instruction = get_extraction_instruction(identity)
    controller = Controller(output_model=GamblingSiteData)
    agent = Agent(
        task=f"Navigate to https://arab19.sbs/ and {extraction_instruction}",
        llm=ChatGoogle(model="gemini-2.5-flash"),
        controller=controller,
    )
    result = await agent.run()
    final = result.final_result()
    # result_json =  extract_json_from_text(result.final_result())
    parsed: GamblingSiteData = GamblingSiteData.model_validate_json(final)
    print(parsed)

asyncio.run(main())

