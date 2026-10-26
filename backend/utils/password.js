// Règle des mots de passe (inscription, changement, comptes créés par l'administrateur) :
// 8 caractères minimum, au moins une lettre et un chiffre, pas un mot de passe trop courant.
const COMMON = new Set(['password', 'password1', 'azerty123', 'azertyuiop1', 'qwerty123', '12345678', '123456789', '1234567890', '123456a', 'motdepasse1', 'motdepasse123', 'boutik123', 'admin123', 'admin1234', 'bienvenue1', 'senegal123', 'dakar1234', 'abc12345', 'iloveyou1', 'passer123']);

// Renvoie un message d'erreur, ou '' si le mot de passe convient
function passwordProblem(pw) {
  const p = String(pw || '');
  if (p.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
  if (p.length > 128) return 'Le mot de passe est trop long (128 caractères maximum)';
  if (!/[A-Za-zÀ-ÿ]/.test(p) || !/\d/.test(p)) return 'Le mot de passe doit contenir au moins une lettre et un chiffre';
  if (COMMON.has(p.toLowerCase())) return 'Ce mot de passe est trop courant, choisissez-en un autre';
  return '';
}

module.exports = { passwordProblem };
