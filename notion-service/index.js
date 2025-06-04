require('dotenv').config({path: '../config/.env'});

const express = require('express');
const {Client} = require('@notionhq/client');
const app = express();

const notion = new Client({auth: process.env.NOTION_TOKEN});

app.get('/valida_en_lista', async (req, res) => {
    try {
        const accountNumber = req.query.accountNumber;

        if (!accountNumber || isNaN(parseInt(accountNumber))) {
            return res.status(400).json({error: 'accountNumber es requerido y debe ser un número.'});
        }

        const response = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID_LISTA,
            filter: {
                property: 'Cuenta',
                number: {equals: parseInt(accountNumber)}
            }
        });

        if (response.results.length === 0) {
            return res.status(404).json({error: 'No se encontró el número de cuenta'});
        }

        const page = response.results[0];

        if (!page.properties.Correo || !page.properties.Correo.email) {
            return res.status(500).json({error: 'La propiedad "Correo" no tiene formato válido.'});
        }

        res.json({
            email: page.properties.Correo.email
        });

    } catch (error) {
        console.error('Error en Notion Service:', error);
        res.status(500).json({error: 'Error consultando Notion'});
    }
});

app.get('/calificaciones', async (req, res) => {
    try {
        const accountNumber = req.query.accountNumber;

        // Calificaciones semanales
        const response1 = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID_SEMANALES,
            filter: {
                property: 'Cuenta',
                rich_text: {equals: accountNumber}
            }
        });

        if (response1.results.length === 0) {
            return res.status(404).json({error: 'No se encontraron registros para este número de cuenta'});
        }

        const semanales = response1.results[0];

        // Calificaciones tareas
        const response2 = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID_TAREAS,
            filter: {
                property: 'Cuenta',
                rich_text: {equals: accountNumber}
            }
        });

        if (response2.results.length === 0) {
            return res.status(404).json({error: 'No se encontraron registros para este número de cuenta'});
        }

        const tareas = response2.results[0];

        // Calificaciones examenes parciales
        const response3 = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID_PARCIALES,
            filter: {
                property: 'Cuenta',
                rich_text: {equals: accountNumber}
            }
        });

        if (response3.results.length === 0) {
            return res.status(404).json({error: 'No se encontraron registros para este número de cuenta'});
        }

        const parciales = response3.results[0];

        // Calificaciones P-S
        const response4 = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID_PROBLEMAS,
            filter: {
                property: 'Cuenta',
                rich_text: {equals: accountNumber}
            }
        });

        if (response4.results.length === 0) {
            return res.status(404).json({error: 'No se encontraron registros para este número de cuenta'});
        }

        const problemas = response4.results[0];

        // Calificaciones proyecto
        const response5 = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID_PROYECTO,
            filter: {
                property: 'Cuenta',
                rich_text: {equals: accountNumber}
            }
        });

        if (response5.results.length === 0) {
            return res.status(404).json({error: 'No se encontraron registros para este número de cuenta'});
        }

        const practica = response5.results[0];

        // Calificaciones finales
        const response0 = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID_FINALES,
            filter: {
                property: 'Cuenta',
                rich_text: {equals: accountNumber}
            }
        });

        if (response0.results.length === 0) {
            return res.status(404).json({error: 'No se encontraron registros para este número de cuenta'});
        }

        const finales = response0.results[0];


        // Promedio
        const promedio =
            0.3 * parciales.properties.Promedio.formula.number +
            0.3 * tareas.properties.Promedio.formula.number +
            0.2 * semanales.properties.Promedio.formula.number +
            0.1 * practica.properties.Promedio.number +
            0.1 * problemas.properties.Promedio.formula.number

        res.json({
            semanales: semanales.properties.Promedio.formula.number,
            detalleSemanales: Array.from({length: 10}, (_, i) => `Semanal ${i + 1}`)
                .reduce((acc, key) => {
                    acc[key] = semanales.properties[key].number;
                    return acc;
                }, {}),
            tareas: tareas.properties.Promedio.formula.number,
            detalleTareas: Array.from({length: 4}, (_, i) => `Tarea ${i + 1}`)
                .reduce((acc, key) => {
                    acc[key] = tareas.properties[key].number;
                    return acc;
                }, {}),
            parciales: parciales.properties.Promedio.formula.number,
            detalleParciales: Array.from({length: 3}, (_, i) => `Parcial ${i + 1}`)
                .reduce((acc, key) => {
                    acc[key] = parciales.properties[key].number;
                    return acc;
                }, {}),
            problemas: problemas.properties.Promedio.formula.number,
            detalleProblemas: Array.from({length: 4}, (_, i) => `Set ${i + 1}`)
                .reduce((acc, key) => {
                    acc[key] = problemas.properties[key].number;
                    return acc;
                }, {}),
            practica: practica.properties.Promedio.number,
            extra: {
                "Parcial 4": parciales.properties["Parcial 4"].number,
                "Parcial 5": parciales.properties["Parcial 5"].number,
            },
            promedio: promedio,
            finalPrimera: finales.properties["Primera vuelta"].number,
        });

    } catch (error) {
        console.error('Error en Notion Service:', error);
        res.status(500).json({error: 'Error consultando Notion'});
    }
});

app.get('/calificacionfinal', async (req, res) => {
    try {
        const accountNumber = req.query.accountNumber;

        if (!accountNumber || isNaN(parseInt(accountNumber))) {
            return res.status(400).json({error: 'accountNumber es requerido y debe ser un número.'});
        }

        const response = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID_LISTA,
            filter: {
                property: 'Cuenta',
                number: {equals: parseInt(accountNumber)}
            }
        });

        if (response.results.length === 0) {
            return res.status(404).json({error: 'No se encontró el número de cuenta'});
        }

        const page = response.results[0];
        const calificacionProp = page.properties['Calificacion'];

        let calificacionFinal = '';
        if (calificacionProp.rich_text && calificacionProp.rich_text.length > 0) {
            calificacionFinal = calificacionProp.rich_text[0].plain_text;
        }

        res.json({
            final: calificacionFinal
        });

    } catch (error) {
        console.error('Error en Notion Service:', error);
        res.status(500).json({error: 'Error consultando Notion'});
    }
});


app.listen(4000, () => console.log('Notion Service running on port 4000'));