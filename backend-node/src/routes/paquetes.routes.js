import { Router } from 'express';
import { check } from 'express-validator';
import { crearPaquete, obtenerPaquetes, eliminarPaquete } from '../controllers/paquete.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { validarCampos } from '../middlewares/validarCampos.middleware.js';

const router = Router();

router.use(verificarToken);

router.get('/', obtenerPaquetes);
router.post('/', [
    check('nombre', 'El nombre es obligatorio').trim().not().isEmpty(),
    check('planes', 'Debe incluir al menos un plan').isArray({ min: 1 }),
    check('planes.*', 'ID de plan no válido').isMongoId(),
    validarCampos
], crearPaquete);
router.delete('/:id', [check('id', 'ID no válido').isMongoId(), validarCampos], eliminarPaquete);

export default router;
