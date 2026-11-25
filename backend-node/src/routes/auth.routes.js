import { Router } from 'express';
import { check } from 'express-validator';
import {
    login,
    registrarUsuario,
    obtenerPerfil,
    actualizarPerfil
} from '../controllers/auth.controller.js';
import { limitadorLogin, limitadorRegistro } from '../middlewares/rateLimit.middleware.js';
import { validarCampos } from '../middlewares/validarCampos.middleware.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router = Router();

const checksRegistro = [
    check('nombre', 'El nombre es obligatorio').trim().not().isEmpty(),
    check('nombre', 'El nombre no puede superar los 60 caracteres').isLength({ max: 60 }),
    check('email', 'El email no es válido').isEmail().normalizeEmail(),
    check('password', 'La contraseña debe tener al menos 8 caracteres').isLength({ min: 8 }),
    check('password', 'La contraseña debe tener al menos una letra y un número')
        .matches(/[A-Za-z]/).matches(/\d/),
];

const checksLogin = [
    check('email', 'El email no es válido').isEmail().normalizeEmail(),
    check('password', 'La contraseña es obligatoria').not().isEmpty(),
];

const checksPerfil = [
    check('nombre', 'El nombre no puede estar vacio').optional().trim().not().isEmpty(),
    check('diasAviso', 'Los días de aviso deben ser un número entre 0 y 30').optional().isInt({ min: 0, max: 30 }).toInt(),
];

router.post('/registro', limitadorRegistro, [...checksRegistro, validarCampos], registrarUsuario);
router.post('/login', limitadorLogin, [...checksLogin, validarCampos], login);
router.get('/perfil', verificarToken, obtenerPerfil);
router.patch('/perfil', verificarToken, [...checksPerfil, validarCampos], actualizarPerfil);

export default router;