#!/usr/bin/env python3
"""
Test script for Bot API endpoints
Run with: python test_bot_api.py
"""

import asyncio
import json
from typing import Dict, Any

from .service import BotService
from .models import ChatRequest, LLMProvider, ResponseToggleRequest


async def test_bot_service():
    """Test the BotService functionality"""
    print("🧪 Testing Bot Service...")
    
    try:
        # Initialize service
        bot_service = BotService()
        print("✅ BotService initialized successfully")
        
        # Test 1: HyDE question generation
        print("\n🔍 Testing HyDE question generation...")
        test_query = "How does machine learning work?"
        questions = await bot_service.generate_hyde_questions(
            test_query, 
            LLMProvider.OLLAMA
        )
        print(f"Generated {len(questions)} questions:")
        for i, q in enumerate(questions, 1):
            print(f"  {i}. {q}")
        
        # Test 2: Response generation
        print("\n💭 Testing response generation...")
        response_result = await bot_service.generate_response(
            questions[0], 
            LLMProvider.OLLAMA,
            temperature=0.7
        )
        print(f"Response length: {len(response_result['response'])} characters")
        print(f"Metadata: {response_result['metadata']}")
        
        # Test 3: Full chat request processing
        print("\n🚀 Testing full chat request...")
        chat_request = ChatRequest(
            query=test_query,
            provider=LLMProvider.OLLAMA,
            temperature=0.7
        )
        
        chat_response = await bot_service.process_chat_request(
            chat_request, 
            user_id="test_user_123"
        )
        
        print(f"Thread ID: {chat_response.thread_id}")
        print(f"Generated {len(chat_response.responses)} responses")
        print(f"Sub-queries count: {len(chat_response.sub_queries)}")
        
        # Test 4: Response preference
        print("\n⭐ Testing response preference...")
        preference_request = ResponseToggleRequest(
            thread_id=chat_response.thread_id,
            response_key="query_A",
            preferred=True
        )
        
        preference_result = await bot_service.switch_response_preference(preference_request)
        print(f"Preference updated: {preference_result}")
        
        # Test 5: Thread retrieval
        print("\n📖 Testing thread retrieval...")
        retrieved_thread = await bot_service.get_thread(chat_response.thread_id)
        if retrieved_thread:
            print(f"Retrieved thread with {len(retrieved_thread.get('sub_queries', []))} interactions")
        else:
            print("❌ Failed to retrieve thread")
        
        print("\n✅ All tests completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_api_models():
    """Test Pydantic model validation"""
    print("\n📋 Testing API models...")
    
    try:
        # Test ChatRequest validation
        valid_request = ChatRequest(
            query="Test query",
            provider=LLMProvider.OLLAMA,
            temperature=0.7,
            max_tokens=1500
        )
        print("✅ ChatRequest validation passed")
        
        # Test invalid temperature
        try:
            invalid_request = ChatRequest(
                query="Test",
                temperature=3.0  # Invalid: > 2.0
            )
            print("❌ Should have failed validation")
        except ValueError:
            print("✅ Temperature validation works")
        
        # Test ResponseToggleRequest
        toggle_request = ResponseToggleRequest(
            thread_id="test_thread",
            response_key="query_A",
            preferred=True
        )
        print("✅ ResponseToggleRequest validation passed")
        
        return True
        
    except Exception as e:
        print(f"❌ Model test failed: {e}")
        return False


async def main():
    """Run all tests"""
    print("🤖 Bot API Test Suite")
    print("=" * 50)
    
    # Test models first
    model_test = test_api_models()
    
    if model_test:
        # Test service functionality
        service_test = await test_bot_service()
        
        if service_test:
            print("\n🎉 All tests passed! Bot API is ready.")
        else:
            print("\n❌ Service tests failed.")
    else:
        print("\n❌ Model tests failed.")


if __name__ == "__main__":
    asyncio.run(main())
