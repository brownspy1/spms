import re
from typing import Tuple, List

# Common PII regex patterns
EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
PHONE_PATTERN = re.compile(r'(\+?[0-9]{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}')
SSN_PATTERN = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')

# Suspicious prompt injection phrases
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(previous|above|all)\s+instructions",
    r"system\s+prompt",
    r"reveal\s+(internal|system|developer|hidden)\s+(instructions|prompt)",
    r"you\s+are\s+now\s+in\s+DAN\s+mode",
    r"act\s+as\s+an\s+unrestricted",
    r"bypass\s+safety\s+guidelines",
    r"jailbreak",
    r"<script.*?>",
    r"drop\s+table",
    r"delete\s+from\s+users",
    r"--\s*$",
]

def mask_pii(text: str) -> str:
    """
    Strips or masks direct patient identifiers before sending prescription or note text
    to third-party LLMs or external processing APIs.
    """
    if not text:
        return ""
    
    masked = EMAIL_PATTERN.sub("[EMAIL_MASKED]", text)
    masked = PHONE_PATTERN.sub("[PHONE_MASKED]", masked)
    masked = SSN_PATTERN.sub("[ID_MASKED]", masked)
    return masked

def sanitize_and_check_prompt_injection(user_input: str) -> Tuple[bool, str, str]:
    """
    Validates and sanitizes all inputs to the AI Assistant to reduce prompt-injection risk.
    Returns: (is_safe: bool, sanitized_text: str, reason: str)
    """
    if not user_input or not user_input.strip():
        return True, "", ""
    
    # Strip HTML tags and null bytes
    cleaned = re.sub(r'<[^>]*>', '', user_input)
    cleaned = cleaned.replace('\x00', '')
    
    # Check for known prompt-injection triggers
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, cleaned, re.IGNORECASE):
            return False, "", f"Potentially malicious instruction or prompt injection detected: '{pattern}'"
    
    # Mask PII
    safe_text = mask_pii(cleaned)
    return True, safe_text.strip(), ""
