from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError
from typing import List, Optional
import json
import time
from datetime import datetime
from chats.chats import EducationConversationSystem, OpenAIClient, LocalLLMClient, Role
from core import configuration
from core.logger import logger, LoggerUtils
config = configuration.config

# Create router
router = APIRouter(prefix="/api/v1", tags=["chats"])

class TechnicalParagraphRequest(BaseModel):
    paragraph: str = Field(..., description="The technical paragraph to generate conversation about", min_length=10)
    max_turns_per_learner: Optional[int] = Field(default=3, description="Maximum conversation turns per learner", ge=1, le=10)
    llm_provider: Optional[str] = Field(default="openai", description="LLM provider: 'openai' or 'local'")
    api_key: Optional[str] = Field(default=None, description="OpenAI API key (optional if set in environment)")
    model: Optional[str] = Field(default="gpt-4o", description="OpenAI model to use")
    local_model: Optional[str] = Field(default="llama3:8b-instruct-q4_K_M", description="Local Ollama model to use")
    include_shivam: Optional[bool] = Field(default=True, description="Include Shivam (beginner learner) in the conversation")
    include_prem: Optional[bool] = Field(default=True, description="Include Prem (advanced learner) in the conversation")
    shivam_description: Optional[str] = Field(default=None, description="Custom description for Shivam's persona")
    prem_description: Optional[str] = Field(default=None, description="Custom description for Prem's persona")
    shivam_questions: Optional[List[str]] = Field(default=None, description="List of questions from Shivam (optional)")
    prem_questions: Optional[List[str]] = Field(default=None, description="List of questions from Prem (optional)")
    num_questions_per_learner: Optional[int] = Field(default=None, description="Number of questions per learner (overrides max_turns_per_learner)")

class ConversationTurnResponse(BaseModel):
    speaker: str = Field(..., description="Name of the speaker")
    text: str = Field(..., description="The spoken text")
    complexity_level: Optional[str] = Field(default=None, description="Complexity level of the response")

class ConversationResponse(BaseModel):
    conversation: List[ConversationTurnResponse] = Field(..., description="List of conversation turns")
    total_turns: int = Field(..., description="Total number of turns in the conversation")
    success: bool = Field(..., description="Whether the conversation generation was successful")
    message: str = Field(..., description="Status message")
    timestamp: str = Field(..., description="Timestamp of the request")
    learners_included: List[str] = Field(..., description="List of learners included in the conversation")

def get_llm_client(request: TechnicalParagraphRequest):
    """Dependency to create and validate LLM client"""
    start_time = time.time()
    
    logger.info(f"🔧 Creating LLM client", extra={
        "provider": request.llm_provider,
        "model": request.model if request.llm_provider == "openai" else request.local_model
    })
    
    try:
        if request.llm_provider == "openai":
            # Use API key from request if provided, otherwise use environment variable
            api_key = request.api_key or config.openai.api_key
            if not api_key:
                logger.error("❌ OpenAI API key missing")
                raise HTTPException(
                    status_code=400, 
                    detail="OpenAI API key is required. Provide it in the request or set OPENAI_API_KEY environment variable."
                )
            
            client = OpenAIClient(api_key, request.model)
            
            # Test connection
            if not client.test_connection():
                logger.error("❌ OpenAI connection test failed")
                raise HTTPException(status_code=500, detail="Failed to connect to OpenAI API")
            
            duration = (time.time() - start_time) * 1000
            logger.success(f"✅ OpenAI client created and tested successfully", extra={
                "model": request.model,
                "duration": round(duration, 2)
            })
            return client
            
        elif request.llm_provider == "local":
            client = LocalLLMClient(request.local_model)
            
            # Test connection
            if not client.test_connection():
                logger.error("❌ Local LLM connection test failed")
                raise HTTPException(status_code=500, detail="Failed to connect to local LLM service")
            
            duration = (time.time() - start_time) * 1000
            logger.success(f"✅ Local LLM client created and tested successfully", extra={
                "model": request.local_model,
                "duration": round(duration, 2)
            })
            return client
            
        else:
            logger.error(f"❌ Invalid LLM provider: {request.llm_provider}")
            raise HTTPException(
                status_code=400, 
                detail="Invalid LLM provider. Use 'openai' or 'local'"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        logger.error(f"❌ Error creating LLM client: {str(e)}", extra={
            "provider": request.llm_provider,
            "duration": round(duration, 2),
            "error_type": type(e).__name__
        })
        LoggerUtils.log_error_with_context(e, {
            "component": "llm_client_creation",
            "provider": request.llm_provider,
            "duration": duration
        })
        raise HTTPException(status_code=500, detail=f"Error creating LLM client: {str(e)}")

@router.post("/generate-conversation", response_model=ConversationResponse)
async def generate_conversation(
    request: TechnicalParagraphRequest,
    llm_client: LocalLLMClient = Depends(get_llm_client)
):
    """
    Generate an educational conversation about a technical paragraph.
    
    This endpoint creates a multi-persona conversation involving:
    - Pranav: Expert explainer who provides layered explanations
    - Shivam: Beginner learner asking basic questions (optional)
    - Prem: Advanced learner asking deep technical questions (optional)
    
    Users can choose to include either Shivam, Prem, or both learners,
    provide custom descriptions for their personas, and specify their own questions.
    If no questions are provided, Pranav will generate appropriate questions based on each persona.
    """
    start_time = time.time()
    request_id = f"conv_{int(start_time * 1000)}"
    
    logger.info(f"🚀 Starting conversation generation", extra={
        "request_id": request_id,
        "paragraph_length": len(request.paragraph),
        "llm_provider": request.llm_provider,
        "max_turns": request.max_turns_per_learner,
        "include_shivam": request.include_shivam,
        "include_prem": request.include_prem
    })
    
    try:
        # Check if this is a direct mode (no learners, just Pranav's explanation)
        is_direct_mode = not request.include_shivam and not request.include_prem
        
        if is_direct_mode:
            logger.info(f"📝 Direct mode: Generating Pranav's explanation only", extra={"request_id": request_id})
        else:
            logger.info(f"📝 Multi-persona mode: Including learners", extra={
                "request_id": request_id,
                "include_shivam": request.include_shivam,
                "include_prem": request.include_prem
            })
        
        logger.info(f"📝 Processing paragraph", extra={
            "request_id": request_id,
            "paragraph_preview": request.paragraph[:100],
            "shivam_questions_count": len(request.shivam_questions) if request.shivam_questions else 0,
            "prem_questions_count": len(request.prem_questions) if request.prem_questions else 0
        })
        
        # Initialize conversation system
        system_start = time.time()
        system = EducationConversationSystem(
            llm_client, 
            request.max_turns_per_learner,
            include_shivam=request.include_shivam,
            include_prem=request.include_prem,
            shivam_description=request.shivam_description,
            prem_description=request.prem_description
        )
        system_init_duration = (time.time() - system_start) * 1000
        
        logger.debug(f"⚙️ Conversation system initialized", extra={
            "request_id": request_id,
            "init_duration": round(system_init_duration, 2)
        })
        
        # Generate conversation
        conversation_start = time.time()
        conversation_turns = system.generate_conversation(
            request.paragraph,
            shivam_questions=request.shivam_questions,
            prem_questions=request.prem_questions,
            num_questions_per_learner=request.num_questions_per_learner,
            direct_mode=is_direct_mode
        )
        conversation_duration = (time.time() - conversation_start) * 1000
        
        # Convert to response format
        response_start = time.time()
        conversation_response = []
        for turn in conversation_turns:
            conversation_response.append(ConversationTurnResponse(
                speaker=turn.speaker.value,
                text=turn.text,
                complexity_level=turn.complexity_level
            ))
        
        # Determine which learners were included
        learners_included = []
        if request.include_shivam:
            learners_included.append("Shivam")
        if request.include_prem:
            learners_included.append("Prem")
        
        response_build_duration = (time.time() - response_start) * 1000
        total_duration = (time.time() - start_time) * 1000
        
        logger.success(f"🎉 Conversation generated successfully", extra={
            "request_id": request_id,
            "total_turns": len(conversation_turns),
            "total_duration": round(total_duration, 2),
            "conversation_duration": round(conversation_duration, 2),
            "response_build_duration": round(response_build_duration, 2),
            "learners_included": learners_included,
            "turns_per_second": round(len(conversation_turns) / (total_duration / 1000), 2)
        })
        
        # Log API performance
        LoggerUtils.log_performance("api_conversation_generation", total_duration,
                                  turns=len(conversation_turns),
                                  paragraph_length=len(request.paragraph),
                                  llm_provider=request.llm_provider)
        
        return ConversationResponse(
            conversation=conversation_response,
            total_turns=len(conversation_turns),
            success=True,
            message="Conversation generated successfully",
            timestamp=datetime.now().isoformat(),
            learners_included=learners_included
        )
    
    except HTTPException:
        raise
    except Exception as e:
        total_duration = (time.time() - start_time) * 1000
        logger.error(f"❌ Error generating conversation: {str(e)}", extra={
            "request_id": request_id,
            "duration": round(total_duration, 2),
            "error_type": type(e).__name__,
            "paragraph_length": len(request.paragraph)
        })
        LoggerUtils.log_error_with_context(e, {
            "component": "api_conversation_generation",
            "request_id": request_id,
            "duration": total_duration,
            "llm_provider": request.llm_provider
        })
        raise HTTPException(status_code=500, detail=f"Error generating conversation: {str(e)}")
