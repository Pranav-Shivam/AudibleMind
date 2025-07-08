| Layer                  | Final Choice                                                                   |
| ---------------------- | ------------------------------------------------------------------------------ |
| Framework              | FastAPI                                                                        |
| Document Parser        | Adobe PDF Extract API                                                          |
| LLM (via Ollama)       | ✅ Primary: **LLaMA 3 8B Instruct** <br> 🔁 Fallback: **Mixtral 8x7B Instruct** |
| TTS (local)            | ✅ Primary: **Piper TTS** <br> 🎙️ Optional: **Coqui TTS**                      |
| Audio Storage          | Local                                                |
| Async Handling         | FastAPI BackgroundTasks (or Celery for scale)                                  |
| Prompting              | Custom, dynamic templates                                                      |
