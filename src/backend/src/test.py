import asyncio
from dotenv import load_dotenv
load_dotenv()
from browser_use import Agent
from browser_use.llm import ChatGoogle
from config import extraction_instruction

async def main():
    agent = Agent(
        task=f"Navigate to https://pentago29.sbs/ and {extraction_instruction}",
        llm=ChatGoogle(model="gemini-2.5-flash"),
    )
    await agent.run()

asyncio.run(main())

