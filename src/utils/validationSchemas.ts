import * as Yup from 'yup';

export const registerSchema = Yup.object({
  userName: Yup.string()
    .min(3, 'Au moins 3 caractères')
    .max(30, 'Maximum 30 caractères')
    .required('Nom d\'utilisateur requis'),

  email: Yup.string()
    .email('Email invalide')
    .required('Email requis'),

  // Doit rester aligné sur la règle serveur (server/src/controllers/auth.controller.ts,
  // register : password.length < 8) — sinon un mot de passe de 6-7
  // caractères passe la validation locale puis se fait rejeter par le
  // serveur avec un message générique, après que l'utilisateur ait déjà
  // rempli tout le formulaire.
  password: Yup.string()
    .min(8, 'Au moins 8 caractères')
    .required('Mot de passe requis'),

  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Les mots de passe ne correspondent pas')
    .required('Confirmation requise'),
});

export const loginSchema = Yup.object({
  email: Yup.string()
    .email('Email invalide')
    .required('Email requis'),

  password: Yup.string()
    .min(6, 'Au moins 6 caractères')
    .required('Mot de passe requis'),
});

export const addDeviceSchema = Yup.object({
  imei: Yup.string()
    .required('ID du traceur requis')
    .test(
      'imei-or-tracker-id',
      'L\'IMEI ou l\'ID du traceur est invalide',
      (value) => {
        if (!value) return false;
        return /^\d{15}$/.test(value) || /^[A-Z0-9-]{5,30}$/i.test(value);
      }
    ),

  pin: Yup.string()
    .notRequired()
    .matches(/^[A-Z0-9]{6}$/i, {
      message: 'Le code d\'activation fait 6 caractères',
      excludeEmptyString: true,
    }),

  nom: Yup.string()
    .min(2, 'Au moins 2 caractères')
    .max(50, 'Maximum 50 caractères')
    .required('Nom de l\'appareil requis'),
});