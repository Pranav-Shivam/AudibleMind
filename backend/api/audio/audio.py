from fastapi import FastAPI, HTTPException, Request, Form, APIRouter
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
import pyttsx3
import tempfile
import os
import shutil
from typing import Optional
import uuid
import json
import re

audio_router = APIRouter()

# Ensure audio directory exists
AUDIO_DIR = os.path.join(os.path.dirname(__file__), "data", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

class TextToSpeechRequest(BaseModel):
    text: str
    filename: Optional[str] = None
    
    class Config:
        extra = "ignore"
        arbitrary_types_allowed = True
        json_encoders = {
            str: lambda v: v
        }

def get_tts_engine():
    try:
        engine = pyttsx3.init()
        voices = engine.getProperty('voices')
        if voices:
            engine.setProperty('voice', voices[0].id)
        return engine
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize TTS engine: {str(e)}")

def optimize_text_for_indian_english_tts(text: str) -> str:
    cleaned_text = text.strip()
    
    # Remove all asterisks
    cleaned_text = cleaned_text.replace('*', '')
    
    # Remove markdown formatting
    cleaned_text = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned_text)
    cleaned_text = re.sub(r'\*(.*?)\*', r'\1', cleaned_text)
    cleaned_text = re.sub(r'`(.*?)`', r'\1', cleaned_text)
    cleaned_text = re.sub(r'#+\s*', '', cleaned_text)
    cleaned_text = re.sub(r'^\s*[-*+]\s*', '', cleaned_text, flags=re.MULTILINE)
    cleaned_text = re.sub(r'^\s*\d+\.\s*', '', cleaned_text, flags=re.MULTILINE)
    cleaned_text = re.sub(r'^\s*>\s*', '', cleaned_text, flags=re.MULTILINE)
    cleaned_text = re.sub(r'^\s*---+\s*$', '', cleaned_text, flags=re.MULTILINE)
    cleaned_text = re.sub(r'[👍👎🎉🚀]', '', cleaned_text)
    
    # Normalize whitespace
    cleaned_text = re.sub(r'\n\s*\n', '\n\n', cleaned_text)
    cleaned_text = re.sub(r' +', ' ', cleaned_text)
    
    # Add natural pauses for Indian English comprehension
    # Short pause after commas
    cleaned_text = re.sub(r',(\s*)', r', ', cleaned_text)
    
    # Medium pause after periods, exclamation marks, question marks
    cleaned_text = re.sub(r'([.!?])(\s*)', r'\1  ', cleaned_text)
    
    # Short pause after semicolons and colons
    cleaned_text = re.sub(r'([;:])(\s*)', r'\1 ', cleaned_text)
    
    # Brief pause after dashes
    cleaned_text = re.sub(r'([-–—])(\s*)', r'\1 ', cleaned_text)
    
    # Add pause after opening quotes
    cleaned_text = re.sub(r'(["\'"])(\w)', r'\1 \2', cleaned_text)
    
    # Add pause before closing quotes
    cleaned_text = re.sub(r'(\w)(["\'"])', r'\1 \2', cleaned_text)
    
    # Add slight pause after conjunctions for better flow
    cleaned_text = re.sub(r'\b(and|but|or|so|yet|for|nor)\s+', r'\1  ', cleaned_text)
    
    # Add pause after transition words
    cleaned_text = re.sub(r'\b(however|therefore|moreover|furthermore|meanwhile|consequently|nevertheless|thus|hence)\s+', r'\1  ', cleaned_text)
    
    # Clean up excessive spaces
    cleaned_text = re.sub(r'  +', '  ', cleaned_text)
    
    return cleaned_text

def calculate_optimal_rate_for_wpm(target_wpm: int, engine) -> int:
    current_rate = engine.getProperty('rate')
    # Average speaking rate is ~150 WPM at default rate
    # Calculate multiplier to achieve target WPM
    multiplier = target_wpm / 150.0
    return int(current_rate * multiplier)

@audio_router.post("/text-to-speech/")
async def text_to_speech(text: str = Form(..., description="Text to convert to speech"), 
                        filename: Optional[str] = Form(None, description="Optional filename for the audio file")):
    try:
        # Validate text is not empty
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        optimized_text = optimize_text_for_indian_english_tts(text)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Request processing error: {str(e)}")
    
    try:
        engine = get_tts_engine()
        
        # Set optimal rate for Indian English comprehension (130 WPM)
        optimal_rate = calculate_optimal_rate_for_wpm(130, engine)
        engine.setProperty('rate', optimal_rate)
        
        # Set volume to maximum for clarity
        engine.setProperty('volume', 1.0)
        
        # Create temporary file for TTS generation
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        temp_filename = temp_file.name
        temp_file.close()
        
        engine.save_to_file(optimized_text, temp_filename)
        engine.runAndWait()
        engine.stop()
        
        # Generate filename for permanent storage
        if filename:
            # Clean filename to remove invalid characters
            safe_filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
            output_filename = f"{safe_filename}.wav" if not safe_filename.endswith('.wav') else safe_filename
        else:
            # Generate UUID-based filename
            output_filename = f"speech_{uuid.uuid4().hex[:8]}.wav"
        
        # Read the generated audio file as bytes
        with open(temp_filename, 'rb') as audio_file:
            audio_data = audio_file.read()
        
        # Clean up temporary file
        os.unlink(temp_filename)
        
        # Save to permanent location (optional - for debugging)
        permanent_path = os.path.join(AUDIO_DIR, output_filename)
        with open(permanent_path, 'wb') as f:
            f.write(audio_data)
        
        # Return audio data as blob response
        from fastapi.responses import Response
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"inline; filename={output_filename}",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        )
        
    except Exception as e:
        if 'temp_filename' in locals() and os.path.exists(temp_filename):
            os.unlink(temp_filename)
        raise HTTPException(status_code=500, detail=f"Text-to-speech conversion failed: {str(e)}")

@audio_router.get("/voices/")
async def get_available_voices():
    try:
        engine = get_tts_engine()
        voices = engine.getProperty('voices')
        engine.stop()
        
        voice_list = []
        for voice in voices:
            voice_list.append({
                "id": voice.id,
                "name": voice.name,
                "languages": voice.languages,
                "gender": voice.gender,
                "age": voice.age
            })
        
        return {"voices": voice_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get voices: {str(e)}")

@audio_router.get("/audio/")
async def list_audio_files():
    """List all saved audio files"""
    try:
        if not os.path.exists(AUDIO_DIR):
            return {"files": []}
        
        files = []
        for filename in os.listdir(AUDIO_DIR):
            if filename.endswith('.wav'):
                file_path = os.path.join(AUDIO_DIR, filename)
                file_stat = os.stat(file_path)
                files.append({
                    "filename": filename,
                    "size_bytes": file_stat.st_size,
                    "created": file_stat.st_ctime,
                    "modified": file_stat.st_mtime
                })
        
        # Sort by creation time (newest first)
        files.sort(key=lambda x: x["created"], reverse=True)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list audio files: {str(e)}")

@audio_router.get("/audio/{filename}")
async def get_audio_file(filename: str):
    """Get a specific audio file"""
    try:
        # Security check: prevent directory traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        file_path = os.path.join(AUDIO_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="audio/wav"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get audio file: {str(e)}")

@audio_router.delete("/audio/{filename}")
async def delete_audio_file(filename: str):
    """Delete a specific audio file"""
    try:
        # Security check: prevent directory traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        file_path = os.path.join(AUDIO_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        os.remove(file_path)
        return {"message": f"Audio file '{filename}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete audio file: {str(e)}")

@audio_router.get("/")
async def root():
    return {
        "message": "Text-to-Speech API - Optimized for Indian English",
        "version": "1.0.0",
        "speech_rate": "135 WPM (optimized for Indian English comprehension)",
        "endpoints": {
            "POST /text-to-speech/": "Convert text to speech using form data (text, filename)",
            "GET /voices/": "Get available voices",
            "GET /audio/": "List all saved audio files",
            "GET /audio/{filename}": "Get a specific audio file",
            "DELETE /audio/{filename}": "Delete a specific audio file",
            "GET /": "API information"
        }
    }