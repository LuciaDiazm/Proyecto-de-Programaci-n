import { Router } from 'express';
import { check } from 'express-validator';
import {
    obtenerNotificaciones,
    contarNoLeidas,
    marcarComoLeida,
    marcarTodasComoLeidas,
    ejecutarRevision
} from '../controllers/notificacion.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { verificarRolAdmin } from '../middlewares/rol.middleware.js';
import { validarCampos } from '../middlewares/validarCampos.middleware.js';

const router = Router();

router.use(verificarToken); // Todas las rutas de este archivo requieren login

router.get('/', obtenerNotificaciones);
router.get('/contador', contarNoLeidas);
router.patch('/leer-todas', marcarTodasComoLeidas);
router.patch('/:id/leida', [check('id', 'ID no valido').isMongoId(), validarCampos], marcarComoLeida);
router.post('/revisar', verificarRolAdmin, ejecutarRevision);

export default router;
