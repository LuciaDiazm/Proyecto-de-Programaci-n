import { Usuario } from "../models/Usuario.js";
import { generarAccessToken } from "../services/token.service.js";

export const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        // Se toman SOLO estos campos: nadie puede registrarse enviando "rol": "ADMIN"
        const usuario = new Usuario({ nombre, email, password });
        await usuario.save();
        res.status(201).json({ mensaje: "Usuario registrado", token: generarAccessToken(usuario), usuario });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ mensaje: "El email ya está registrado" });
        }
        res.status(400).json({ mensaje: "No se pudo registrar el usuario", detalle: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // La contraseña tiene select: false, hay que pedirla explícitamente
        const usuario = await Usuario.findOne({ email }).select('+password');
        if (!usuario) {
            return res.status(401).json({ mensaje: "Credenciales inválidas" });
        }
        const passwordCorrecto = await usuario.compararPassword(password);
        if (!passwordCorrecto) {
            return res.status(401).json({ mensaje: "Credenciales inválidas" });
        }
        res.status(200).json({ mensaje: "Login exitoso", token: generarAccessToken(usuario), usuario });
    } catch (error) {
        res.status(500).json({ mensaje: "Error en el servidor" });
    }
};

export const obtenerPerfil = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id);
        if (!usuario) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }
        res.status(200).json(usuario);
    } catch (error) {
        res.status(500).json({ mensaje: "Error en el servidor" });
    }
};

export const actualizarPerfil = async (req, res) => {
    try {
        const { nombre, diasAviso } = req.body;
        const cambios = {};
        if (nombre !== undefined) cambios.nombre = nombre;
        if (diasAviso !== undefined) cambios.diasAviso = diasAviso;
        const usuario = await Usuario.findByIdAndUpdate(
            req.usuario.id,
            cambios,
            { new: true, runValidators: true }
        );
        if (!usuario) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }
        res.status(200).json(usuario);
    } catch (error) {
        res.status(400).json({ mensaje: "Error al actualizar el perfil", detalle: error.message });
    }
};