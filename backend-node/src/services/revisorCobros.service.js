import mongoose from 'mongoose';
import { Usuario } from '../models/Usuario.js';
import { Notificacion } from '../models/Notificacion.js';
import { obtenerProximosCobros } from './django.service.js';
import { emitirAUsuario } from '../sockets/index.js';

// Fecha de hoy en Argentina con formato AAAA-MM-DD (el mismo que usa Django)
const hoyEnArgentina = () =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

// Diferencia en días entre dos fechas AAAA-MM-DD
export const diasEntre = (desde, hasta) => {
    const [a1, m1, d1] = desde.split('-').map(Number);
    const [a2, m2, d2] = hasta.split('-').map(Number);
    return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
};

const formatearMonto = (monto, moneda) =>
    `${moneda === 'USD' ? 'US$' : '$'} ${Number(monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const armarAviso = (cobro, dias) => {
    const monto = formatearMonto(cobro.monto, cobro.moneda);
    if (dias < 0) {
        return {
            tipo: 'COBRO_ATRASADO',
            titulo: `${cobro.nombre}: cobro sin confirmar`,
            mensaje: `El cobro de ${monto} era el ${cobro.proxima_fecha_cobro}. Si ya lo pagaste, registralo.`
        };
    }
    if (dias === 0) {
        return {
            tipo: 'COBRO_HOY',
            titulo: `Hoy se cobra ${cobro.nombre}`,
            mensaje: `Hoy se debita ${monto}.`
        };
    }
    return {
        tipo: 'COBRO_PROXIMO',
        titulo: `${cobro.nombre} se cobra en ${dias} ${dias === 1 ? 'día' : 'días'}`,
        mensaje: `El ${cobro.proxima_fecha_cobro} se debitan ${monto}.`
    };
};

export const revisarCobros = async () => {
    const cobros = await obtenerProximosCobros(30);
    const hoy = hoyEnArgentina();

    // Traemos de una sola vez la configuración de aviso de los usuarios involucrados
    const idsUsuarios = [...new Set(cobros.map((c) => c.usuario_id))].filter((id) => mongoose.isValidObjectId(id));
    const usuarios = await Usuario.find({ _id: { $in: idsUsuarios } }).select('diasAviso');
    const diasAvisoPorUsuario = new Map(usuarios.map((u) => [String(u._id), u.diasAviso]));

    let nuevas = 0;

    for (const cobro of cobros) {
        const diasAviso = diasAvisoPorUsuario.get(cobro.usuario_id);
        if (diasAviso === undefined) continue; // Usuario inexistente

        const dias = diasEntre(hoy, cobro.proxima_fecha_cobro);
        if (dias > diasAviso) continue; // Todavía falta para avisar

        const aviso = armarAviso(cobro, dias);
        const clave = `${cobro.id}-${aviso.tipo}-${cobro.proxima_fecha_cobro}`;

        // upsert + $setOnInsert: si ya existe la misma clave, no se crea de nuevo
        const resultado = await Notificacion.updateOne(
            { usuario: cobro.usuario_id, clave },
            {
                $setOnInsert: {
                    ...aviso,
                    usuario: cobro.usuario_id,
                    clave,
                    suscripcionId: cobro.id,
                    fechaCobro: cobro.proxima_fecha_cobro,
                    leida: false
                }
            },
            { upsert: true }
        );

        if (resultado.upsertedCount > 0) {
            nuevas++;
            emitirAUsuario(cobro.usuario_id, 'notificacion:nueva', { titulo: aviso.titulo, mensaje: aviso.mensaje, tipo: aviso.tipo });
        }
    }

    return { revisados: cobros.length, nuevas };
};

export const iniciarRevisorCobros = () => {
    const minutos = Number(process.env.MINUTOS_REVISION_COBROS) || 60;

    const ejecutar = async () => {
        try {
            const { revisados, nuevas } = await revisarCobros();
            console.log(`Revision de cobros: ${revisados} revisados, ${nuevas} notificaciones nuevas`);
        } catch (error) {
            // Si Django está caído no se cae Node: se reintenta en la próxima vuelta
            console.error(`No se pudieron revisar los cobros: ${error.message}`);
        }
    };

    setTimeout(ejecutar, 5000); // Primera revisión al iniciar (con unos segundos para que Django esté listo)
    setInterval(ejecutar, minutos * 60 * 1000);
};
