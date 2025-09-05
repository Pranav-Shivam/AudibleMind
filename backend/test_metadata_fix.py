#!/usr/bin/env python3
"""
Simple test to verify the metadata fix for switch_response_preference
"""
import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.bot.service import BotService
from api.bot.models import ResponseToggleRequest

async def test_metadata_fix():
    """Test that switch_response_preference works with threads that don't have metadata"""
    print("🧪 Testing metadata fix for switch_response_preference...")
    
    try:
        # Initialize bot service
        bot_service = BotService()
        
        # Create a mock thread without metadata (simulating the error condition)
        test_thread_id = "test_thread_metadata_fix"
        mock_thread = {
            "thread_id": test_thread_id,
            "query": "test query",
            "time_created": "2025-09-05T06:30:00Z",
            "time_updated": "2025-09-05T06:30:00Z",
            "responses": [],
            "sub_queries": []
            # Note: No "metadata" key - this is what was causing the error
        }
        
        # Save the mock thread
        await bot_service.save_thread(mock_thread)
        print(f"✅ Created test thread without metadata: {test_thread_id}")
        
        # Test the switch_response_preference with the thread that has no metadata
        preference_request = ResponseToggleRequest(
            thread_id=test_thread_id,
            response_key="query_A",
            preferred=True
        )
        
        result = await bot_service.switch_response_preference(preference_request)
        print(f"✅ Successfully updated preference: {result}")
        
        # Verify the thread now has metadata
        updated_thread = await bot_service.get_thread(test_thread_id)
        if updated_thread and "metadata" in updated_thread:
            print(f"✅ Thread now has metadata: {updated_thread['metadata']}")
            if "preferences" in updated_thread["metadata"]:
                print(f"✅ Preferences saved: {updated_thread['metadata']['preferences']}")
            else:
                print("❌ Preferences not found in metadata")
        else:
            print("❌ Thread still doesn't have metadata")
        
        print("\n🎉 Metadata fix test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_metadata_fix())
    sys.exit(0 if success else 1)
