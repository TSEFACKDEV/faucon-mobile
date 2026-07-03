import * as Yup from 'yup';

export const registerSchema = Yup.object({
  userName: Yup.string()
    .min(3, 'Au moins 3 caractères')
    .max(30, 'Maximum 30 caractères')
    .required('Nom d\'utilisateur requis'),

  email: Yup.string()
    .email('Email invalide')
    .required('Email requis'),

  password: Yup.string()
    .min(6, 'Au moins 6 caractères')
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
    .matches(/^\d{15}$/, 'L\'IMEI doit contenir exactement 15 chiffres')
    .required('IMEI requis'),

  nom: Yup.string()
    .min(2, 'Au moins 2 caractères')
    .max(50, 'Maximum 50 caractères')
    .required('Nom de l\'appareil requis'),
});