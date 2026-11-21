import { Router } from 'express';
import { analizarSuscripciones, obtenerUltimoAnalisis } from '../controllers/ia.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';
import { limitadorIA } from '../middlewares/rateLimit.middleware.js';

const router = Router();

router.post('/analizar', verificarToken, limitadorIA, analizarSuscripciones);
router.get('/ultimo', verificarToken, obtenerUltimoAnalisis);

export default router;
