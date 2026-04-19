export const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function validateEmail(email: string): string | null {
  const e = email.trim();
  if (!e) return "Email requis.";
  if (e.length > 254) return "Email trop long.";
  if (!EMAIL_REGEX.test(e)) return "Format d'email invalide.";
  return null;
}

export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  special: boolean;
}

export function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function passwordScore(c: PasswordChecks): number {
  return Object.values(c).filter(Boolean).length;
}

export function validatePassword(password: string): string | null {
  const c = checkPassword(password);
  if (!c.length) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!c.upper) return "Le mot de passe doit contenir au moins une lettre majuscule.";
  if (!c.lower) return "Le mot de passe doit contenir au moins une lettre minuscule.";
  if (!c.digit) return "Le mot de passe doit contenir au moins un chiffre.";
  if (!c.special) return "Le mot de passe doit contenir au moins un caractère spécial.";
  return null;
}
