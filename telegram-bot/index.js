'use strict';

require('dotenv').config({path: '../config/.env'});
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});
const db = new sqlite3.Database('./bot.db');


db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS chats (chat_id INTEGER PRIMARY KEY)');
    db.run(`
        CREATE TABLE IF NOT EXISTS usage
        (
            chat_id
            INTEGER
            PRIMARY
            KEY,
            request_count
            INTEGER
            DEFAULT
            0,
            last_request_date
            TEXT
        )
    `);
});

function isValidAccountNumber(accountNumber) {
    return /^\d{8,10}$/.test(accountNumber);
}

function checkUsageLimit(chatId) {
    return new Promise((resolve, reject) => {
        const currentDate = new Date().toISOString().split('T')[0];

        db.get(
            `SELECT request_count, last_request_date
             FROM usage
             WHERE chat_id = ?`,
            [chatId],
            (err, row) => {
                if (err) return reject(err);

                // Primera vez: el usuario no ha pedido nunca una calicación
                if (!row) {
                    db.run(
                        `INSERT INTO usage
                             (chat_id, request_count, last_request_date)
                         VALUES (?, ?, ?)`,
                        [chatId, 1, currentDate],
                        (err) => err ? reject(err) : resolve({
                            allowed: true,
                            remaining: 1
                        })
                    );
                    return resolve({
                        allowed: true,
                        remaining: 1
                    })
                }
                // Ya hay registro de que haya pedido
                if (row.last_request_date === currentDate) {
                    if (row.request_count >= 2) {
                        resolve({allowed: false, remaining: 0});
                    } else {
                        db.run(
                            `INSERT
                            OR REPLACE INTO usage 
                        (chat_id, request_count, last_request_date) 
                        VALUES (?, ?, ?)`,
                            [chatId, 2, currentDate],
                            (err) => err ? reject(err) : resolve({
                                allowed: true,
                                remaining: 0
                            })
                        );
                    }
                } else {
                    db.run(
                        `INSERT
                        OR REPLACE INTO usage 
                        (chat_id, request_count, last_request_date) 
                        VALUES (?, ?, ?)`,
                        [chatId, 1, currentDate],
                        (err) => err ? reject(err) : resolve({
                            allowed: true,
                            remaining: 1
                        })
                    );
                }
            }
        );
    });
}


bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    db.get('SELECT chat_id FROM chats WHERE chat_id = ?', [chatId], (err, row) => {
        const response = row ?
            '⚠️ Ya has iniciado el bot antes. Usa /help para ver las instrucciones.' :
            '📚 *Bot de Calificaciones*\n\nEnvía tu número de cuenta con el formato:\n/consultar [número]\n\n📝 *Ejemplo:*\n/consultar 321176898';

        if (!row) {
            db.run('INSERT INTO chats (chat_id) VALUES (?)', [chatId]);
        }

        bot.sendMessage(chatId, response, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
    });
});


bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const response = [
        '_Envía tu número de cuenta con el formato:_',
        '`/consultar [número]`',
        '',
        '📝 *Ejemplo:*',
        '`/consultar 321176898`',
        '',
        `🔐 Límite diario: 2 consultas por día`
    ].join('\n');

    bot.sendMessage(chatId, response, {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true
    });
});


bot.onText(/\/consultar(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;

    try {
        if (!match[1]) {
            return await bot.sendMessage(
                chatId,
                '❌ *Falta tu número de cuenta.*\n\nFormato requerido:\n/consultar [número]\n\n📝 Ejemplo: `/consultar 321176898`',
                {parse_mode: 'Markdown'}
            );
        }

        const accountNumber = match[1].trim();
        if (!isValidAccountNumber(accountNumber)) {
            return await bot.sendMessage(
                chatId,
                '❌ *Formato inválido*\n\nEl número debe:\n- Tener 8-10 dígitos\n- Solo números\n\n📝 Ejemplo: `/consultar 321176898`',
                {parse_mode: 'Markdown'}
            );
        }

        console.log(`El chat ${chatId} solicitó la calificación de ${accountNumber}`);


        const usage = await checkUsageLimit(chatId);
        if (!usage.allowed) {
            return await bot.sendMessage(
                chatId,
                '❌ *Límite diario alcanzado*\n\nSolo puedes realizar 2 consultas por día.\n\nVuelve mañana.',
                {parse_mode: 'Markdown'}
            );
        }

        await bot.sendMessage(chatId, `🔍 Buscando calificaciones para: ${accountNumber}...`);

        const apiResponse = await axios.post(
            `${process.env.API_GATEWAY_URL}/consultar`,
            {accountNumber}
        );


        await bot.sendMessage(
            chatId,
            `✅ ${apiResponse.data.message}\n\n\nConsultas restantes hoy: ${usage.remaining}`,
            {parse_mode: 'Markdown'}
        );


    } catch (error) {
        let errorMessage = '⚠️ Error al procesar tu solicitud. Intenta más tarde.';

        if (error.response) {
            if (error.response.status === 404 || error.response.status === 400) {
                errorMessage = `⚠️ ${error.response.data.error}`;
            }
        }

        await bot.sendMessage(chatId, errorMessage);
        console.error('Error en /consultar:', error);
    }
});


console.log('Bot en funcionamiento...');