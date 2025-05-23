FROM node:18-bullseye

WORKDIR /app

# Instala dependencias incluyendo sqlite3 de sistema
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Primero copia solo lo necesario para instalar dependencias
COPY package.json package-lock.json ./

# Reconstruye las dependencias nativas
RUN npm install --build-from-source sqlite3
RUN npm install --production

COPY . .

# Asegura los permisos correctos
RUN chown -R node:node /app
USER node

CMD ["npm", "start"]