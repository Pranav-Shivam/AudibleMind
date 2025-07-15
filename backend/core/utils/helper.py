from ast import literal_eval
import re, uuid
import time
from core.configuration import *
from core.logger import logger, LoggerUtils
import openai
import tiktoken

EMBEDDING_ENCODING = "cl100k_base"


def calculate_tokens(text):
    """Calculate token count for text"""
    start_time = time.time()
    
    try:
        encoding = tiktoken.get_encoding(EMBEDDING_ENCODING)
        token_count = len(encoding.encode(text))
        
        duration = (time.time() - start_time) * 1000
        logger.debug(f"🔢 Token calculation completed", extra={
            "text_length": len(text),
            "token_count": token_count,
            "duration": round(duration, 2),
            "encoding": EMBEDDING_ENCODING
        })
        
        return token_count
        
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        logger.error(f"❌ Token calculation failed: {e}", extra={
            "text_length": len(text),
            "duration": round(duration, 2)
        })
        LoggerUtils.log_error_with_context(e, {
            "component": "token_calculation",
            "text_length": len(text),
            "duration": duration
        })
        return 0

def generate_uid():
    """Generate unique identifier"""
    uid = str(uuid.uuid4())
    uid = uid.replace('-', '')[:32]
    
    logger.debug(f"🆔 Generated UID: {uid[:8]}...", extra={"uid": uid})
    return uid

def openai_request(messages,
                           model,
                           temperature=0,
                           json_format=False,
                           timeout=None):
    """Make OpenAI API request with comprehensive logging"""
    start_time = time.time()
    request_id = f"openai_{int(start_time * 1000)}"
    
    logger.info(f"🚀 Making OpenAI request", extra={
        "request_id": request_id,
        "model": model,
        "message_count": len(messages),
        "temperature": temperature,
        "json_format": json_format,
        "timeout": timeout
    })
    
    try:
        kwargs = {
            "model": model,
            "temperature": temperature,
            "messages": messages,
            "timeout": timeout
        }

        if json_format:
            kwargs["response_format"] = {"type": "json_object"}

        kwargs = {k:v for k,v in kwargs.items() if v}

        client = openai.OpenAI(api_key=OPENAI_KEY)
        response = client.chat.completions.create(**kwargs)
        
        duration = (time.time() - start_time) * 1000
        usage = getattr(response, 'usage', None)
        
        logger.success(f"✅ OpenAI request completed", extra={
            "request_id": request_id,
            "duration": round(duration, 2),
            "total_tokens": usage.total_tokens if usage else 0,
            "prompt_tokens": usage.prompt_tokens if usage else 0,
            "completion_tokens": usage.completion_tokens if usage else 0
        })
        
        LoggerUtils.log_llm_operation("openai", model, 
                                    usage.total_tokens if usage else 0, 
                                    duration)
        
        return response.choices[0].message
        
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        logger.error(f"❌ OpenAI request failed: {e}", extra={
            "request_id": request_id,
            "duration": round(duration, 2),
            "model": model,
            "error_type": type(e).__name__
        })
        LoggerUtils.log_error_with_context(e, {
            "component": "openai_request",
            "request_id": request_id,
            "model": model,
            "duration": duration
        })
        raise


def parse_openai_dict(openai_output):
    """Parse OpenAI output to dictionary with error handling"""
    start_time = time.time()
    
    logger.debug(f"📝 Parsing OpenAI output", extra={
        "output_length": len(openai_output),
        "output_preview": openai_output[:100]
    })
    
    try:
        openai_output = openai_output.replace("json","")
        dictionary_match = re.search(r'{[^}]*}', openai_output)
        
        if dictionary_match:
            dictionary_string = dictionary_match.group()
            try:
                try:
                    result_dict = literal_eval(openai_output)
                except:
                    result_dict = literal_eval(dictionary_string)
                
                duration = (time.time() - start_time) * 1000
                logger.success(f"✅ OpenAI output parsed successfully", extra={
                    "result_keys": list(result_dict.keys()) if isinstance(result_dict, dict) else [],
                    "duration": round(duration, 2)
                })
                
                return result_dict
                
            except ValueError as e:
                duration = (time.time() - start_time) * 1000
                logger.warning(f"⚠️ Failed to parse dictionary from OpenAI output", extra={
                    "duration": round(duration, 2),
                    "error": str(e)
                })
                return {}
        else:
            duration = (time.time() - start_time) * 1000
            logger.warning(f"⚠️ No dictionary found in OpenAI output", extra={
                "duration": round(duration, 2),
                "output_preview": openai_output[:100]
            })
            return {}
            
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        logger.error(f"❌ Error parsing OpenAI output: {str(e)}", extra={
            "duration": round(duration, 2),
            "output_length": len(openai_output)
        })
        LoggerUtils.log_error_with_context(e, {
            "component": "openai_output_parsing",
            "output_length": len(openai_output),
            "duration": duration
        })
        return {}
