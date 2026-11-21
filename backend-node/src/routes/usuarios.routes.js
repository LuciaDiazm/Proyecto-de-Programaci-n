import { Router } from 'express';
import { check } from 'express-validator';
import { buscarUsuarioPorEmail } from '../controllers/usuario.controller.js';
import { verificarApiKey } from '../middlewares/apiKey.middleware.js';
import { validarCampos } from '../middlewares/validarCampos.middleware.js';

const router = Router();

router.get('/interno/buscar', verificarApiKey, [
    check('email', 'El email no es valido').isEmail().normalizeEmail(),
    validarCampos
], buscarUsuarioPorEmail);

export default router;
