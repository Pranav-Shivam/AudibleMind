"""
Test script for the new conversation management system.
This script tests the context-aware conversation flow.
"""

import asyncio
import time
from typing import Dict, Any

from core.conversation import conversation_context_manager, get_conversation_manager
from core.logger import logger


class ConversationManagementTest:
    """Test suite for conversation management features"""
    
    def __init__(self):
        self.conversation_manager = get_conversation_manager()
        self.context_manager = conversation_context_manager
        
    async def test_context_relevance_scoring(self):
        """Test the relevance scoring mechanism"""
        logger.info("🧪 Testing context relevance scoring")
        
        # Test 1: No previous context
        result1 = self.context_manager.analyze_query_relevance("What is machine learning?")
        assert result1.score == 0.0
        assert not result1.is_continuation
        logger.info(f"✅ Test 1 passed: {result1.reasoning}")
        
        # Add some context
        context1 = self.context_manager.add_context(
            thread_id="test_thread_1",
            query="What is machine learning?",
            response="Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data."
        )
        
        # Test 2: Related query (should have high relevance)
        result2 = self.context_manager.analyze_query_relevance(
            "Can you give me examples of machine learning algorithms?",
            thread_id="test_thread_1"
        )
        logger.info(f"✅ Test 2 - Related query relevance: {result2.score:.3f} - {result2.reasoning}")
        
        # Test 3: Unrelated query (should have low relevance)
        result3 = self.context_manager.analyze_query_relevance(
            "What's the weather like today?",
            thread_id="test_thread_1"
        )
        logger.info(f"✅ Test 3 - Unrelated query relevance: {result3.score:.3f} - {result3.reasoning}")
        
        return {
            "no_context": result1.score,
            "related_query": result2.score,
            "unrelated_query": result3.score
        }
    
    async def test_conversation_flow(self):
        """Test the complete conversation flow"""
        logger.info("🧪 Testing conversation flow")
        
        # Test conversation sequence
        queries = [
            "What is Python programming?",
            "Can you show me a simple Python example?",
            "How do I install Python libraries?",
            "What's the capital of France?"  # Unrelated query
        ]
        
        results = []
        thread_id = None
        
        for i, query in enumerate(queries):
            logger.info(f"🔄 Processing query {i+1}: {query[:50]}...")
            
            try:
                result = await self.conversation_manager.process_conversation(
                    user_query=query,
                    thread_id=thread_id,
                    provider="ollama",  # Using ollama for testing
                    temperature=0.7,
                    max_tokens=200,
                    metadata={"test_query": i+1}
                )
                
                # Use the thread_id from the first response for continuation
                if i == 0:
                    thread_id = result["thread_id"]
                
                results.append({
                    "query": query,
                    "thread_id": result["thread_id"],
                    "was_continuation": result.get("was_continuation", False),
                    "context_used": result.get("context_used", 0),
                    "response_length": len(result.get("response", "")),
                    "reasoning": result.get("metadata", {}).get("reasoning", "")
                })
                
                logger.info(f"✅ Query {i+1} processed - Continuation: {result.get('was_continuation', False)}")
                
            except Exception as e:
                logger.error(f"❌ Error processing query {i+1}: {e}")
                results.append({
                    "query": query,
                    "error": str(e)
                })
        
        return results
    
    async def test_thread_management(self):
        """Test thread creation and management"""
        logger.info("🧪 Testing thread management")
        
        # Create multiple threads
        threads = []
        
        for i in range(3):
            result = await self.conversation_manager.process_conversation(
                user_query=f"Test query {i+1} about different topic",
                provider="ollama",
                temperature=0.5,
                max_tokens=100
            )
            
            threads.append(result["thread_id"])
            logger.info(f"✅ Created thread {i+1}: {result['thread_id']}")
        
        # Test context isolation
        stats = self.context_manager.get_stats()
        logger.info(f"📊 Context stats: {stats}")
        
        return {
            "threads_created": len(threads),
            "stats": stats
        }
    
    async def test_performance(self):
        """Test performance of the conversation system"""
        logger.info("🧪 Testing performance")
        
        start_time = time.time()
        
        # Process multiple queries in sequence
        queries = [
            "What is artificial intelligence?",
            "Tell me about neural networks",
            "How does deep learning work?"
        ]
        
        thread_id = None
        for query in queries:
            result = await self.conversation_manager.process_conversation(
                user_query=query,
                thread_id=thread_id,
                provider="ollama",
                temperature=0.7,
                max_tokens=150
            )
            
            if thread_id is None:
                thread_id = result["thread_id"]
        
        duration = (time.time() - start_time) * 1000
        
        logger.info(f"⚡ Performance test completed in {duration:.2f}ms")
        
        return {
            "total_duration_ms": duration,
            "queries_processed": len(queries),
            "avg_duration_per_query": duration / len(queries)
        }
    
    async def run_all_tests(self):
        """Run all tests"""
        logger.info("🚀 Starting conversation management tests")
        
        test_results = {}
        
        try:
            # Test 1: Context relevance scoring
            test_results["relevance_scoring"] = await self.test_context_relevance_scoring()
            
            # Test 2: Conversation flow
            test_results["conversation_flow"] = await self.test_conversation_flow()
            
            # Test 3: Thread management
            test_results["thread_management"] = await self.test_thread_management()
            
            # Test 4: Performance
            test_results["performance"] = await self.test_performance()
            
            logger.success("✅ All conversation management tests completed")
            
        except Exception as e:
            logger.error(f"❌ Test suite failed: {e}")
            test_results["error"] = str(e)
        
        return test_results


async def main():
    """Main test function"""
    test_suite = ConversationManagementTest()
    results = await test_suite.run_all_tests()
    
    print("\n" + "="*50)
    print("CONVERSATION MANAGEMENT TEST RESULTS")
    print("="*50)
    
    for test_name, result in results.items():
        print(f"\n{test_name.upper()}:")
        if isinstance(result, dict):
            for key, value in result.items():
                print(f"  {key}: {value}")
        else:
            print(f"  {result}")
    
    print("\n" + "="*50)


if __name__ == "__main__":
    asyncio.run(main())
