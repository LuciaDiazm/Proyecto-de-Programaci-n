// SDD: el contrato del proyecto define que todo error sale como { "error": true, "mensaje": "..." }.
export const formatoError = (req, res, next) => {
    const jsonOriginal = res.json.bind(res);

    res.json = (cuerpo) => {
        const esObjeto = cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo);
        if (res.statusCode >= 400 && esObjeto && cuerpo.error === undefined) {
            return jsonOriginal({ error: true, ...cuerpo });
        }
        return jsonOriginal(cuerpo);
    };

    next();
};
