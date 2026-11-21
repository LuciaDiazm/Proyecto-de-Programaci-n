import { Router } from 'express';
import { consultarCotizacion } from '../controllers/cotizacion.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', verificarToken, consultarCotizacion);

export default router;
