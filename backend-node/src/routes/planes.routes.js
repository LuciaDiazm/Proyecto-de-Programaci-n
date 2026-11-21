import { Router } from 'express';
import { check } from 'express-validator';
import {
    crearPlan,
    obtenerPlanes,
    obtenerPlanesResumidos,
    obtenerPlanesDetallados,
    obtenerPlanPorId,
    actualizarPlan,
    eliminarPlan
} from '../controllers/plan.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRolAdmin } from '../middlewares/rol.middleware.js';
import { validarCampos } from '../middlewares/validarCampos.middleware.js';

const router = Router();

const checkId = check('id', 'ID no valido').isMongoId();

const checksPlan = [
    check('nombre', 'El nombre es obligatorio').trim().not().isEmpty(),
    check('precio', 'El precio debe ser un numero positivo').isFloat({ min: 0 }).toFloat(),
    check('moneda', 'Moneda no valida').optional().isIn(['ARS', 'USD']),
];

router.use(verificarToken);

router.get('/', obtenerPlanes);
router.get('/resumen', obtenerPlanesResumidos);
router.get('/detalle', obtenerPlanesDetallados);
router.get('/:id', [checkId, validarCampos], obtenerPlanPorId);
router.post('/', [
    ...checksPlan,
    check('proveedor', 'El proveedor no es valido').isMongoId(),
    validarCampos
], crearPlan);
router.put('/:id', [checkId, ...checksPlan, validarCampos], actualizarPlan);
router.delete('/:id', verificarRolAdmin, [checkId, validarCampos], eliminarPlan);

export default router;
