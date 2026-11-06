import * as Yup from 'yup';

type Lang = 'fr' | 'en';
const m = (lang: Lang, fr: string, en: string) => (lang === 'en' ? en : fr);

export const getRegisterSchema = (lang: Lang = 'fr') => Yup.object({
  userName: Yup.string()
    .min(3, m(lang, 'Au moins 3 caractères', 'At least 3 characters'))
    .max(30, m(lang, 'Maximum 30 caractères', 'Maximum 30 characters'))
    .required(m(lang, "Nom d'utilisateur requis", 'Username required')),

  email: Yup.string()
    .email(m(lang, 'Email invalide', 'Invalid email'))
    .required(m(lang, 'Email requis', 'Email required')),

  password: Yup.string()
    .min(8, m(lang, 'Au moins 8 caractères', 'At least 8 characters'))
    .required(m(lang, 'Mot de passe requis', 'Password required')),

  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], m(lang, 'Les mots de passe ne correspondent pas', 'Passwords do not match'))
    .required(m(lang, 'Confirmation requise', 'Confirmation required')),
});

export const getLoginSchema = (lang: Lang = 'fr') => Yup.object({
  email: Yup.string()
    .email(m(lang, 'Email invalide', 'Invalid email'))
    .required(m(lang, 'Email requis', 'Email required')),

  password: Yup.string()
    .min(6, m(lang, 'Au moins 6 caractères', 'At least 6 characters'))
    .required(m(lang, 'Mot de passe requis', 'Password required')),
});

export const getAddDeviceSchema = (lang: Lang = 'fr') => Yup.object({
  imei: Yup.string()
    .required(m(lang, 'ID du traceur requis', 'Tracker ID required'))
    .test(
      'imei-or-tracker-id',
      m(lang, "L'IMEI ou l'ID du traceur est invalide", 'The IMEI or tracker ID is invalid'),
      (value) => {
        if (!value) return false;
        return /^\d{15}$/.test(value) || /^[A-Z0-9-]{5,30}$/i.test(value);
      }
    ),

  pin: Yup.string()
    .notRequired()
    .matches(/^[A-Z0-9]{6}$/i, {
      message: m(lang, "Le code d'activation fait 6 caractères", 'The activation code must be 6 characters'),
      excludeEmptyString: true,
    }),

  nom: Yup.string()
    .min(2, m(lang, 'Au moins 2 caractères', 'At least 2 characters'))
    .max(50, m(lang, 'Maximum 50 caractères', 'Maximum 50 characters'))
    .required(m(lang, "Nom de l'appareil requis", 'Device name required')),
});
