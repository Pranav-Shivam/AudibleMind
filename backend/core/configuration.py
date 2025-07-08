import os


SERVER_HOST = "0.0.0.0"
SERVER_PORT = 7000

COUCH_USERNAME = os.environ.get("COUCH_USERNAME","root")
COUCH_PASSWORD = os.environ.get("COUCH_PASSWORD","root")
COUCH_HOST = os.environ.get("COUCH_HOST","localhost")
COUCH_PORT = os.environ.get("COUCH_PORT",5984)

OPENAI_KEY = os.environ.get("OPENAI_KEY")