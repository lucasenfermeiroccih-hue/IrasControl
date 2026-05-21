const AUTH_ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "E-mail ainda não confirmado. Verifique sua caixa de entrada.",
  "User already registered": "Este e-mail já está cadastrado.",
  "Password should be at least 6 characters": "A senha deve ter pelo menos 8 caracteres.",
  "Password should be at least 8 characters": "A senha deve ter pelo menos 8 caracteres.",
  "Password is known to be weak and easy to guess, please choose a different one":
    "Senha muito comum ou fraca. Escolha uma senha mais segura (misture letras, números e símbolos).",
  "For security purposes, you can only request this after":
    "Por segurança, aguarde alguns segundos antes de tentar novamente.",
  "Unable to validate email address: invalid format":
    "Formato de e-mail inválido.",
  "Signup is disabled":
    "Cadastro de novos usuários está desativado. Contate o administrador.",
  "Email rate limit exceeded":
    "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  "Token has expired or is invalid":
    "Link expirado ou inválido. Solicite um novo.",
  "New password should be different from the old password":
    "A nova senha deve ser diferente da senha atual.",
  "Auth session missing":
    "Sessão expirada. Faça login novamente.",
  "User not found":
    "Usuário não encontrado.",
};

export function translateAuthError(message: string): string {
  for (const [en, pt] of Object.entries(AUTH_ERROR_MAP)) {
    if (message.includes(en)) return pt;
  }
  return message;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(password)) return "A senha deve conter pelo menos uma letra.";
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':\"\\|,.<>/?]/.test(password))
    return "A senha deve conter pelo menos um número ou símbolo.";
  return null;
}

export function passwordStrength(password: string): { label: string; color: string; pct: number } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':\"\\|,.<>/?]/.test(password)) score++;

  if (score <= 1) return { label: "Muito fraca", color: "bg-red-500", pct: 20 };
  if (score === 2) return { label: "Fraca", color: "bg-orange-500", pct: 40 };
  if (score === 3) return { label: "Razoável", color: "bg-yellow-500", pct: 60 };
  if (score === 4) return { label: "Forte", color: "bg-blue-500", pct: 80 };
  return { label: "Muito forte", color: "bg-green-500", pct: 100 };
}
