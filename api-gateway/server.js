require('dotenv').config({path: '../config/.env'});

const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

function printDetalle(evaluacion, data, n) {
    let mensaje = "";
    for (let i = 1; i <= n; i++) {
        const llave = `${evaluacion} ${i}`;
        const valor = data[llave];

        mensaje += `\t\t${llave}: ${valor !== null && valor !== undefined
            ? valor.toFixed(2)
            : 0}\n`;
    }
    return mensaje;
}


app.post('/consultar', async (req, res) => {
    try {
        const {accountNumber} = req.body;
        if (!accountNumber) return res.status(400).json({error: 'Falta número de cuenta'});

        const {status, data} = await axios.get(`${process.env.NOTION_SERVICE_URL}/valida_en_lista`, {
            params: {accountNumber},
            validateStatus: null
        });

        if (status === 404 || status === 400) return res.status(status).json(data);

        const {status: status2, data: data2} = await axios.get(`${process.env.NOTION_SERVICE_URL}/calificaciones`, {
            params: {accountNumber},
            validateStatus: null
        });

        if (status2 === 404) return res.status(status2).json(data2);

        let mensaje;

        if (data2.finalPrimera != null) {
            mensaje = `Calificación examen final primera vuelta: ${data2.finalPrimera}`;
            res.json({message: mensaje});
            return;
        }

        mensaje = `El o la alumna con número de cuenta ${accountNumber} tiene las siguientes calificaciones:\n`;

        mensaje += `\nPromedio exámenes semanales: ${data2.semanales != null ? data2.semanales.toFixed(2) : 0}\n`;
        mensaje += printDetalle("Semanal", data2.detalleSemanales, 10);

        mensaje += `\nPromedio tareas: ${data2.tareas != null ? data2.tareas.toFixed(2) : 0}\n`;
        mensaje += printDetalle("Tarea", data2.detalleTareas, 4);

        mensaje += `\nPromedio exámenes parciales: ${data2.parciales != null ? data2.parciales.toFixed(2) : 0}\n`;
        mensaje += printDetalle("Parcial", data2.detalleParciales, 3);

        mensaje += `\nPromedio resolución de problemas: ${data2.problemas != null ? data2.problemas.toFixed(2) : 0}\n`;
        mensaje += printDetalle("Set", data2.detalleProblemas, 4);

        if (data2.practica == null) {
            mensaje += `\nCalificación práctica: Aún no disponible`;
        } else {
            mensaje += `\nCalificación práctica: ${data2.practica.toFixed(2)}`;
        }

        if (data2.semanales != null && data2.semanales < 6.0) {
            mensaje += `\n\nComo tu promedio de semanales es menor que 6, estás en final.\n`;
            mensaje += `\n📅 Fechas de los exámanes finales:\n`;
            mensaje += `\n\tPrimera vuelta: 29-05-2025\n`;
            mensaje += `\n\tSegunda vuelta: 03-06-2025\n`;
        } else {
            const extra1 = ((data2.extra["Parcial 4"] != null ? data2.extra["Parcial 4"].toFixed(2) : 0) / 1).toFixed(2)
            const extra2 = ((data2.extra["Parcial 5"] != null ? data2.extra["Parcial 5"].toFixed(2) : 0) / 1).toFixed(2)
            const promedio = (data2.promedio != null ? data2.promedio : 0).toFixed(2)

            mensaje += `\n\n👀 Calificación extra por concluir el temario:`;
            mensaje += `\n\tParcial 4 (extra): +${extra1}`;
            mensaje += `\n\tParcial 5 (extra): +${extra2}`;

            mensaje += `\n\nPromedio: ${promedio}\n`;

            const final = (parseFloat(promedio) + parseFloat(extra1) + parseFloat(extra2)).toFixed(2);

            let emoji;
            if (9.00 <= final) {
                emoji = `⭐`;
            } else if (8.00 <= final < 9.00) {
                emoji = `👍`;
            } else if (7.00 <= final < 8.00) {
                emoji = `😬`;
            } else {
                emoji = `🤥`;
            }

            mensaje += `\n\n${emoji} Calificación final: ${final}\n`;
        }

        res.json({message: mensaje});

    } catch (error) {
        const message = error.response?.data?.error || 'Error interno';
        res.status(error.response?.status || 500).json({error: message});
    }
});

app.post('/final', async (req, res) => {
    let mensaje;
    try {
        const {accountNumber} = req.body;
        if (!accountNumber) return res.status(400).json({error: 'Falta número de cuenta'});

        const {status, data} = await axios.get(`${process.env.NOTION_SERVICE_URL}/calificacionfinal`, {
            params: {accountNumber},
            validateStatus: null
        });

        if (status === 404 || status === 400) return res.status(status).json(data);


        mensaje = `Tu calificación final del curso es ${data.final}`;
        mensaje += `\n\nSi tienes dudas o comentarios respecto a esta, comunícate en breve.`;

        res.json({message: mensaje});

    } catch (error) {
        const message = error.response?.data?.error || 'Error interno';
        res.status(error.response?.status || 500).json({error: message});
    }
});


app.listen(3000, () => console.log('API Gateway running on port 3000'));