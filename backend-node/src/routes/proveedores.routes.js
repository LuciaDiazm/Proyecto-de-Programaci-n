import { Router } from 'express';
import { check } from 'express-validator';
import {
    crearProveedor,
    obtenerProveedores,
    obtenerProveedorPorId,
    actualizarProveedor,
    calificarProveedor,
    eliminarProveedor
} from '../controllers/proveedor.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRolAdmin } from '../middlewares/rol.middleware.js';
import { validarCampos } from '../middlewares/validarCampos.middleware.js';

const router = Router();

const CATEGORIAS = ['STREAMING', 'SOFTWARE', 'TELEFONIA', 'SERVICIOS', 'OTROS'];

const checkId = check('id', 'ID no válido').isMongoId();

const checksProveedor = [
    check('razonSocial', 'La razón social es obligatoria').trim().not().isEmpty(),
    check('cuit', 'El CUIT debe tener exactamente 11 numeros sin guiones').matches(/^\d{11}$/),
    check('contacto.email', 'El email de contacto no es válido').isEmail(),
    check('categorias', 'Las categorias deben ser una lista').optional().isArray(),
    check('categorias.*', 'Categoría no válida').optional().isIn(CATEGORIAS),
];

router.use(verificarToken); // Todas las rutas de este archivo requieren login

router.get('/', obtenerProveedores);
router.get('/:id', [checkId, validarCampos], obtenerProveedorPorId);
router.post('/', [...checksProveedor, validarCampos], crearProveedor);
router.put('/:id', [checkId, ...checksProveedor, validarCampos], actualizarProveedor);
router.patch('/:id/calificar', [
    checkId,
    check('calificacion', 'La calificación debe ser un número del 1 al 5').isInt({ min: 1, max: 5 }).toInt(),
    validarCampos
], calificarProveedor);

// Flujo: Cliente -> verificarToken -> verificarRolAdmin -> eliminarProveedor
router.delete('/:id', verificarRolAdmin, [checkId, validarCampos], eliminarProveedor);

export default router;
