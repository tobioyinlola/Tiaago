import re

def preprocess_text(text: str) -> str:
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove special characters (keep alphanumeric, spaces, and basic punctuation)
    text = re.sub(r'[^a-zA-Z0-9\s.,;:!?()]', '', text)
    
    # Convert to lowercase
    text = text.lower()
    
    return text