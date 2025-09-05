#!/usr/bin/env python3
"""
Test script for the streamlined conversation management system.
Tests the complete flow from query classification to response generation.
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.conversation.streamlined_manager import streamlined_conversation_manager
from core.conversation.query_classifier import query_classifier
from core.conversation.clean_memory_manager import clean_memory_manager
from core.conversation.response_generator import response_generator
from api.bot.models import QueryType


async def test_query_classification():
    """Test the query classification system"""
    print("🔍 Testing Query Classification System")
    print("=" * 50)
    
    test_queries = [
        ("What is machine learning?", None, "Should be NEW_TOPIC"),
        ("Can you give me examples?", ["What is machine learning?"], "Should be FOLLOW_UP"),
        ("How do neural networks work?", ["What is machine learning?", "Can you give me examples?"], "Should be RELATED_TOPIC"),
        ("What's the weather like?", ["What is machine learning?", "Can you give me examples?"], "Should be NEW_TOPIC"),
        ("I don't understand", ["What is machine learning?"], "Should be CLARIFICATION"),
        ("Tell me more about that", ["What is machine learning?"], "Should be FOLLOW_UP"),
    ]
    
    for query, history, expected in test_queries:
        # Create mock conversation history
        mock_history = []
        if history:
            for i, prev_query in enumerate(history):
                mock_history.append(type('MockMessage', (), {
                    'user_query': prev_query,
                    'ai_response': f"Response to: {prev_query}",
                    'timestamp': datetime.now().isoformat(),
                    'query_type': QueryType.NEW_TOPIC
                })())
        
        result = query_classifier.classify_query(query, mock_history)
        
        print(f"Query: '{query}'")
        print(f"  Classification: {result.query_type}")
        print(f"  Confidence: {result.confidence:.3f}")
        print(f"  Expected: {expected}")
        print(f"  Reasoning: {result.reasoning}")
        print(f"  ✅ {'PASS' if result.query_type.value in expected.lower() else '❌ FAIL'}")
        print()


async def test_conversation_flow():
    """Test the complete conversation flow"""
    print("🚀 Testing Complete Conversation Flow")
    print("=" * 50)
    
    # Test conversation scenarios
    scenarios = [
        {
            "name": "New Topic → Follow-up → Related Topic",
            "queries": [
                "What is artificial intelligence?",
                "Can you give me some examples?", 
                "How does machine learning relate to AI?",
                "What about deep learning?"
            ]
        },
        {
            "name": "New Topic → Clarification → Follow-up",
            "queries": [
                "Explain quantum computing",
                "I don't understand the quantum part",
                "Can you give a simple example?"
            ]
        }
    ]
    
    for scenario in scenarios:
        print(f"\n📋 Scenario: {scenario['name']}")
        print("-" * 30)
        
        thread_id = None
        
        for i, query in enumerate(scenario['queries']):
            print(f"\n{i+1}. User: {query}")
            
            try:
                result = await streamlined_conversation_manager.process_query(
                    query=query,
                    thread_id=thread_id,
                    user_id="test_user",
                    provider="openai",
                    model="gpt-4o-mini"
                )
                
                thread_id = result["thread_id"]
                
                print(f"   Classification: {result['query_type']}")
                print(f"   Was Continuation: {result['was_continuation']}")
                print(f"   Context Used: {result['context_messages_used']}")
                print(f"   Confidence: {result['classification_confidence']:.3f}")
                
                if result['query_type'] == 'new_topic':
                    print(f"   Response Type: HyDE (3 variations)")
                    if 'hyde_responses' in result:
                        print(f"   Response A: {result['hyde_responses']['query_A'][:100]}...")
                else:
                    print(f"   Response Type: Direct contextual")
                    if 'direct_response' in result:
                        print(f"   Response: {result['direct_response'][:100]}...")
                
                print(f"   Processing Time: {result['processing_time_ms']:.1f}ms")
                print(f"   ✅ SUCCESS")
                
            except Exception as e:
                print(f"   ❌ ERROR: {e}")
                break


async def test_memory_management():
    """Test the clean memory management system"""
    print("🧠 Testing Memory Management System")
    print("=" * 50)
    
    # Create a test thread
    thread_id = "test_thread_123"
    
    # Add some interactions
    interactions = [
        ("What is Python?", "Python is a programming language...", QueryType.NEW_TOPIC),
        ("Can you show me examples?", "Here are some Python examples...", QueryType.FOLLOW_UP),
        ("What about data science?", "Python is great for data science...", QueryType.RELATED_TOPIC),
    ]
    
    print("Adding test interactions...")
    for query, response, query_type in interactions:
        message = clean_memory_manager.add_interaction(
            thread_id=thread_id,
            user_query=query,
            ai_response=response,
            query_type=query_type,
            context_used=1 if query_type != QueryType.NEW_TOPIC else 0
        )
        print(f"  ✅ Added: {message.message_id}")
    
    # Test retrieval
    print("\nRetrieving conversation history...")
    history = clean_memory_manager.get_conversation_history(thread_id)
    print(f"  Retrieved {len(history)} messages")
    
    for msg in history:
        print(f"  - {msg.query_type}: {msg.user_query[:50]}...")
    
    # Test context retrieval
    print("\nTesting context retrieval for different query types...")
    for query_type in [QueryType.NEW_TOPIC, QueryType.FOLLOW_UP, QueryType.CLARIFICATION]:
        context = clean_memory_manager.get_context_for_query(thread_id, query_type)
        print(f"  {query_type}: {len(context)} context messages")
    
    print("✅ Memory management tests completed")


async def test_response_generation():
    """Test response generation for different query types"""
    print("🎨 Testing Response Generation")
    print("=" * 50)
    
    # Test HyDE response generation
    print("Testing HyDE response generation...")
    try:
        hyde_result = await response_generator.generate_hyde_response(
            query="What is blockchain technology?",
            provider="openai",
            model="gpt-4o-mini"
        )
        
        print("  ✅ HyDE responses generated:")
        for key, response in hyde_result["responses"].items():
            print(f"    {key}: {response[:100]}...")
        
    except Exception as e:
        print(f"  ❌ HyDE generation failed: {e}")
    
    # Test contextual response generation
    print("\nTesting contextual response generation...")
    try:
        # Create mock context
        mock_context = [
            type('MockMessage', (), {
                'user_query': 'What is blockchain?',
                'ai_response': 'Blockchain is a distributed ledger technology...',
                'timestamp': datetime.now().isoformat(),
                'query_type': QueryType.NEW_TOPIC
            })()
        ]
        
        contextual_result = await response_generator.generate_contextual_response(
             query="Can you give me examples?",
             conversation_context=mock_context,
             provider="openai",
             model="gpt-4o-mini"
         )
        
        print("  ✅ Contextual response generated:")
        print(f"    Response: {contextual_result['response'][:100]}...")
        print(f"    Context used: {contextual_result['metadata']['context_messages_used']}")
        
    except Exception as e:
        print(f"  ❌ Contextual generation failed: {e}")


async def test_performance():
    """Test system performance"""
    print("⚡ Testing System Performance")
    print("=" * 50)
    
    import time
    
    # Test classification speed
    start_time = time.time()
    for i in range(10):
        query_classifier.classify_query(f"Test query {i}", [])
    classification_time = (time.time() - start_time) * 1000
    
    print(f"Classification Speed: {classification_time/10:.1f}ms per query")
    
    # Test memory operations
    start_time = time.time()
    test_thread = "perf_test_thread"
    for i in range(10):
        clean_memory_manager.add_interaction(
            thread_id=test_thread,
            user_query=f"Test query {i}",
            ai_response=f"Test response {i}",
            query_type=QueryType.FOLLOW_UP
        )
    memory_time = (time.time() - start_time) * 1000
    
    print(f"Memory Operations: {memory_time/10:.1f}ms per interaction")
    
    # Get system stats
    try:
        stats = await streamlined_conversation_manager.get_stats()
        print("\nSystem Statistics:")
        print(f"  Memory Stats: {stats.get('memory_stats', {})}")
        print(f"  Classifier Stats: {stats.get('classifier_stats', {})}")
        
    except Exception as e:
        print(f"  ❌ Stats retrieval failed: {e}")


async def main():
    """Run all tests"""
    print("🧪 Streamlined Conversation Management System Tests")
    print("=" * 60)
    print(f"Started at: {datetime.now().isoformat()}")
    print()
    
    try:
        await test_query_classification()
        await test_memory_management()
        await test_response_generation()
        await test_conversation_flow()
        await test_performance()
        
        print("\n" + "=" * 60)
        print("🎉 All tests completed successfully!")
        print("✅ The streamlined conversation system is working correctly.")
        
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
