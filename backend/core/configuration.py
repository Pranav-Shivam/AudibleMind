import os


SERVER_HOST = "0.0.0.0"
SERVER_PORT = 7000

COUCH_USERNAME = os.environ.get("COUCH_USERNAME","root")
COUCH_PASSWORD = os.environ.get("COUCH_PASSWORD","root")
COUCH_HOST = os.environ.get("COUCH_HOST","localhost")
COUCH_PORT = os.environ.get("COUCH_PORT",5984)

COUCH_PDF_DB_NAME = "aud_pdf"
COUCH_DOCUMENT_DB_NAME = "aud_documents"
COUCH_PARAGRAPH_DB_NAME = "aud_paras"

OPENAI_KEY = os.environ.get("OPENAI_KEY")
OPENAI_MODEL = ""



ADOBE_CLIENT_ID = os.environ.get("ADOBE_CLIENT_ID","cce743676d404aaa9e469b616a56418c")
ADOBE_CLIENT_SECRET = os.environ.get("ADOBE_CLIENT_SECRET","p8e-g2otO2nUCz1UYhvJrTDG451-8EYqoYb6")


MAX_PARA_LENGTH = 500

OLLAMA_MODEL = "llama3:8b-instruct-q4_K_M"
CHUNK_SIZE = 2500
