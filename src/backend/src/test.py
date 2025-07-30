import asyncio
import json
import datetime
from dotenv import load_dotenv
load_dotenv()
from browser_use import Agent, Controller
from browser_use.llm import ChatGoogle
from browser_use import Agent, Controller, ActionResult, BrowserContext 
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
    # extraction_instruction = get_extraction_instruction(identities, famous_banks)

    controller = Controller(output_model=GamblingSiteData)
    agent = Agent(
        task=f"Navigate to https://arab19.sbs/ and then go to register page and Save a screenshot of the current page",
        llm=ChatGoogle(model="gemini-2.5-flash"),
        controller=controller,
        capture_screenshots=False
    )

    @controller.action('Save a screenshot of the current page')
    async def save_screenshot(browser: BrowserContext):
        page = await browser.get_current_page()
        screenshot = await page.screenshot(full_page=True, animations='disabled')
        filename = f"screenshot_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        with open(filename, 'wb') as f:
            f.write(screenshot)
        return ActionResult(
            extracted_content=f'Saved a screenshot of the page to {filename}',
            include_in_memory=True
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

async def save_images():
    """Test the storage manager save_file function"""
    from storage import storage_manager
    import os
    
    # Debug: Check environment variables
    print("=== Environment Variables Debug ===")
    print(f"B2_BUCKET_URL: {os.environ.get('B2_BUCKET_URL')}")
    print(f"B2_ACCESS_KEY: {os.environ.get('B2_ACCESS_KEY')[:10]}..." if os.environ.get('B2_ACCESS_KEY') else "B2_ACCESS_KEY: None")
    print(f"B2_SECRET_KEY: {'*' * 10}..." if os.environ.get('B2_SECRET_KEY') else "B2_SECRET_KEY: None")
    print(f"B2_BUCKET_NAME: {os.environ.get('B2_BUCKET_NAME')}")
    print("=====================================")
    
    # Test bucket access first
    storage_manager._ensure_contabu_client()
    if storage_manager.s3_client:
        try:
            print("Testing bucket access...")
            response = storage_manager.s3_client.list_objects_v2(
                Bucket=storage_manager.bucket_name,
                MaxKeys=1
            )
            print("✓ Bucket access successful - can list objects")
        except Exception as e:
            print(f"✗ Bucket access failed: {e}")
            return
    
    # Create a test image file if it doesn't exist
    # test_image_path = "./screenshots/EMI_SARPONIKA.png"
    
    # if not os.path.exists(test_image_path):
    #     print(f"Test image not found at {test_image_path}")
    #     print("Available files in screenshots directory:")
    #     screenshots_dir = "./screenshots"
    #     if os.path.exists(screenshots_dir):
    #         for file in os.listdir(screenshots_dir):
    #             print(f"  - {file}")
    #     return
    
    # try:
    #     print(f"Testing save_file with: {test_image_path}")
        
        # # Test the save_file function
    #     destination_path = "test_uploads/sample_screenshot.png"
    #     result = await storage_manager.save_file("./screenshots/img.png", destination_path)

    #     print(f"✓ File saved successfully!")
    #     # print(f"  Source: {test_image_path}")
    #     print(f"  Destination: {destination_path}")
    #     print(f"  Returned OSS key: {result}")
        
    #     # Test generating a presigned URL
    # # if result:
    #     try:
    #         presigned_url = storage_manager.generate_presigned_url("img.png")
    #         print(f"✓ Presigned URL generated: {presigned_url}")
    #     except Exception as e:
            # print(f"✗ Failed to generate presigned URL: {e}")
        
        # Test generating a public URL
        # if result:
        #     try:
        #         public_url = storage_manager.get_public_url(result)
        #         print(f"✓ Public URL generated: {public_url}")
        #     except Exception as e:
                # print(f"✗ Failed to generate public URL: {e}")
                
    # except FileNotFoundError as e:
    #     print(f"✗ File not found error: {e}")
    # except Exception as e:
    #     print(f"✗ Upload failed: {e}")
    #     print(f"Error type: {type(e).__name__}")


# Run the storage tests
if __name__ == "__main__":
    print("=== Testing Storage Manager ===")
    asyncio.run(save_images())
    

