from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from collections import Counter
import string
from core.logger import logger

class GlobalUtils:
    def __init__(self):
        pass
    def count_words(self, text):
        logger.info(f"🔄 Counting words in text", extra={
            "text": text
        })
        words = text.strip().split()
        return len(words)
    
    def count_sentences(self, text):
        sentences = text.strip().split('.')
        return len(sentences)
    
    def generate_heading(self, text):
        # first five words of the text
        return " ".join(text.split()[:5])
    