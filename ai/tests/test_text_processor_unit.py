from app.services.text_processor import preprocess_text


def test_preprocess_text_normalizes_whitespace_and_case():
    raw = "\nHello\tWorld!!  This\n   is\t  a TEST.\r\n"
    processed = preprocess_text(raw)
    # Collapses whitespace, strips, removes unsupported special chars, lowercases
    assert processed == "hello world!! this is a test."


def test_preprocess_text_removes_unwanted_chars():
    raw = "Name: John Doe — Senior Dev @ Company™ #1 :)"
    processed = preprocess_text(raw)
    # Allowed: letters, numbers, spaces, and basic punctuation . , ; : ! ? ( )
    assert processed == "name: john doe  senior dev  company 1 :)"


