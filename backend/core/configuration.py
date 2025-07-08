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



ADOBE_CLIENT_ID = os.environ.get("ADOBE_CLIENT_ID")
ADOBE_CLIENT_SECRET = os.environ.get("ADOBE_CLIENT_SECRET")


MAX_PARA_LENGTH = 500