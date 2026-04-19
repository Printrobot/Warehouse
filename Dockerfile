# Используем официальный образ Node.js
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь исходный код
COPY . .

# Собираем клиентскую и серверную часть
RUN npm run build

# Пробрасываем порт
EXPOSE 5000

# Запускаем приложение
CMD ["npm", "start"]
