import re


EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


def validate_email_format(email: str) -> str | None:
    """Returns an error message, or None if the email is valid."""
    if not email:
        return "Email requis."
    if len(email) > 254:
        return "Email trop long."
    if not EMAIL_REGEX.match(email):
        return "Format d'email invalide."
    return None


def validate_password_strength(password: str) -> str | None:
    """Returns an error message, or None if the password meets requirements.

    Requirements: ≥ 8 chars, at least one uppercase, one lowercase,
    one digit and one special character.
    """
    if not password:
        return "Mot de passe requis."
    if len(password) < 8:
        return "Le mot de passe doit contenir au moins 8 caractères."
    if not re.search(r"[A-Z]", password):
        return "Le mot de passe doit contenir au moins une lettre majuscule."
    if not re.search(r"[a-z]", password):
        return "Le mot de passe doit contenir au moins une lettre minuscule."
    if not re.search(r"\d", password):
        return "Le mot de passe doit contenir au moins un chiffre."
    if not re.search(r"[^A-Za-z0-9]", password):
        return "Le mot de passe doit contenir au moins un caractère spécial."
    return None
