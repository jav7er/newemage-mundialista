# Etapa 1: Construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar configuración de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci || npm install

# Copiar el código fuente
COPY . .

# Construir el proyecto Vite
RUN npm run build

# Etapa 2: Servidor (Nginx)
FROM nginx:alpine

# Copiar configuración custom de nginx (template: nginx la procesa con envsubst al iniciar
# usando las variables de entorno del contenedor, p.ej. FOOTBALL_DATA_API_KEY)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copiar los archivos estáticos desde la etapa de construcción
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto 80 (Easypanel redirigirá el tráfico aquí)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
