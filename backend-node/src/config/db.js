import mongoose from 'mongoose';

export const conectarBD = async () => {
    try {
        // Usamos await porque la conexión a través de la red toma tiempo
        const conexion = await mongoose.connect(process.env.MONGO_URI);
        console.log(`Base de datos conectada: ${conexion.connection.name}`);
    } catch (error) {
        console.error(`Error al conectar a MongoDB: ${error.message}`);
        process.exit(1); // Sin base de datos la aplicación no puede funcionar
    }
};
