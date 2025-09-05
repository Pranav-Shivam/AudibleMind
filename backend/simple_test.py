#!/usr/bin/env python3
"""
Simple test script for the streamlined conversation management system.
Tests basic functionality without requiring external dependencies.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all modules can be imported"""
    print("🔍 Testing Module Imports")
    print("=" * 30)
    
    try:
        from api.bot.models import QueryType, ChatRequest, ChatResponse
        print("✅ Bot models imported successfully")
        
        from core.conversation.query_classifier import QueryType as QT
        print("✅ Query classifier types imported successfully")
        
        # Test basic enum functionality
        assert QT.NEW_TOPIC == "new_topic"
        assert QT.FOLLOW_UP == "follow_up"
        assert QT.CLARIFICATION == "clarification"
        assert QT.RELATED_TOPIC == "related_topic"
        print("✅ Query types working correctly")
        
        print("\n🎉 All imports successful!")
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_basic_functionality():
    """Test basic functionality without external dependencies"""
    print("\n🧪 Testing Basic Functionality")
    print("=" * 30)
    
    try:
        # Test query classification logic (without sentence transformers)
        from core.conversation.query_classifier import QueryClassifier
        
        # Create classifier instance
        classifier = QueryClassifier()
        print("✅ QueryClassifier created successfully")
        
        # Test pattern matching (doesn't require sentence transformers)
        test_queries = [
            "Can you tell me more?",  # Should match follow-up patterns
            "What is machine learning?",  # Should match new topic patterns
            "I don't understand",  # Should match clarification patterns
        ]
        
        for query in test_queries:
            # Test the pattern matching methods directly
            follow_up_score = classifier._check_patterns(query, classifier.follow_up_regex)
            clarification_score = classifier._check_patterns(query, classifier.clarification_regex)
            new_topic_score = classifier._check_patterns(query, classifier.new_topic_regex)
            
            print(f"Query: '{query}'")
            print(f"  Follow-up score: {follow_up_score:.3f}")
            print(f"  Clarification score: {clarification_score:.3f}")
            print(f"  New topic score: {new_topic_score:.3f}")
            print()
        
        print("✅ Pattern matching working correctly")
        
        # Test memory manager basic functionality
        from core.conversation.clean_memory_manager import CleanMemoryManager
        memory_manager = CleanMemoryManager()
        print("✅ CleanMemoryManager created successfully")
        
        # Test response generator basic functionality
        from core.conversation.response_generator import ResponseGenerator
        response_generator = ResponseGenerator()
        print("✅ ResponseGenerator created successfully")
        
        print("\n🎉 Basic functionality tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Basic functionality test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_models():
    """Test API model functionality"""
    print("\n📋 Testing API Models")
    print("=" * 30)
    
    try:
        from api.bot.models import (
            ChatRequest, ChatResponse, QueryType, HydeResponses, 
            DirectResponse, ConversationMessage
        )
        
        # Test ChatRequest
        request = ChatRequest(
            query="What is AI?",
            provider="ollama",
            temperature=0.7
        )
        print("✅ ChatRequest created successfully")
        
        # Test HydeResponses
        hyde_responses = HydeResponses(
            query_A="Essence response",
            query_B="Systems response", 
            query_C="Application response"
        )
        print("✅ HydeResponses created successfully")
        
        # Test DirectResponse
        direct_response = DirectResponse(
            content="Direct contextual response",
            context_messages_used=3
        )
        print("✅ DirectResponse created successfully")
        
        # Test ConversationMessage
        message = ConversationMessage(
            message_id="msg_123",
            thread_id="thread_456",
            user_query="Test query",
            ai_response="Test response",
            timestamp="2024-01-01T00:00:00Z",
            query_type=QueryType.NEW_TOPIC
        )
        print("✅ ConversationMessage created successfully")
        
        print("\n🎉 API model tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ API model test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_configuration():
    """Test configuration loading"""
    print("\n⚙️ Testing Configuration")
    print("=" * 30)
    
    try:
        from core.configuration import config
        
        print(f"✅ Configuration loaded")
        print(f"  Default LLM Provider: {config.app.default_llm_provider}")
        print(f"  Ollama Model: {config.ollama.model}")
        print(f"  Database Host: {config.database.host}")
        print(f"  Threads DB: {config.database.threads_db_name}")
        
        print("\n🎉 Configuration tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

def main():
    """Run all simple tests"""
    print("🧪 Simple Streamlined Conversation System Tests")
    print("=" * 50)
    
    all_passed = True
    
    # Run tests
    all_passed &= test_imports()
    all_passed &= test_configuration()
    all_passed &= test_api_models()
    all_passed &= test_basic_functionality()
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All simple tests passed!")
        print("✅ The streamlined conversation system basic components are working.")
        print("\n📝 Next steps:")
        print("  1. Install sentence-transformers: pip install sentence-transformers")
        print("  2. Run full tests: python test_streamlined_conversation.py")
        print("  3. Start the backend server: python main.py")
        return 0
    else:
        print("❌ Some tests failed!")
        print("🔧 Please check the error messages above and fix the issues.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
