import { Router } from 'express';
import { check } from 'express-validator';
import {
    registrarPrecio,
    obtenerHistorialDeSuscripcion,
    obtenerUltimosAumentos
} from '../controllers/historial.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarApiKey } from '../middlewares/apiKey.middleware.js';
import { validarCampos } from '../middlewares/validarCampos.middleware.js';

const router = Router();

const checksPrecio = [
    check('usuarioId', 'El usuarioId debe ser un ID valido').isMongoId(),
    check('suscripcionId', 'El suscripcionId debe ser un numero').isInt({ min: 1 }).toInt(),
    check('nombreSuscripcion', 'El nombre es obligatorio').trim().not().isEmpty(),
    check('precioNuevo', 'El precio debe ser un numero positivo').isFloat({ min: 0 }).toFloat(),
    check('precioAnterior', 'El precio anterior debe ser un numero').optional({ values: 'null' }).isFloat({ min: 0 }).toFloat(),
    check('moneda', 'Moneda no valida').isIn(['ARS', 'USD']),
    check('monedaAnterior', 'Moneda anterior no valida').optional({ values: 'null' }).isIn(['ARS', 'USD']),
];

// Solo Django (servidor a servidor)
router.post('/interno', verificarApiKey, [...checksPrecio, validarCampos], registrarPrecio);

// Usuario logueado
router.get('/aumentos', verificarToken, obtenerUltimosAumentos);
router.get('/:suscripcionId', verificarToken, [
    check('suscripcionId', 'El id debe ser un numero').isInt({ min: 1 }),
    validarCampos
], obtenerHistorialDeSuscripcion);

export default router;
