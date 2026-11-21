import { readFileSync } from 'fs';

// Módulo 4, patrón "Backend as a Bridge": el navegador no habla con Firebase.
// El backend escucha la base y reenvía los cambios por Socket.IO.
// Es opcional: sin FIREBASE_KEY_PATH y FIREBASE_DATABASE_URL no se activa.
export const iniciarPuenteFirebase = async (io) => {
    const { FIREBASE_KEY_PATH, FIREBASE_DATABASE_URL } = process.env;

    if (!FIREBASE_KEY_PATH || !FIREBASE_DATABASE_URL) {
        console.log('Puente con Firebase desactivado (faltan las variables de entorno)');
        return;
    }

    try {
        const { default: admin } = await import('firebase-admin');
        const cuentaDeServicio = JSON.parse(readFileSync(FIREBASE_KEY_PATH, 'utf-8'));

        admin.initializeApp({
            credential: admin.credential.cert(cuentaDeServicio),
            databaseURL: FIREBASE_DATABASE_URL
        });

        admin.database().ref('ofertas_destacadas').on('value', (snapshot) => {
            // Cuando Firebase detecta un cambio, le avisamos a todos los clientes conectados
            io.emit('actualizacion_ofertas', snapshot.val());
        });

        console.log('Puente con Firebase activo');
    } catch (error) {
        console.error(`No se pudo iniciar el puente con Firebase: ${error.message}`);
    }
};
