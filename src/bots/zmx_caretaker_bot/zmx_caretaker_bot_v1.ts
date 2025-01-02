import { Client, Events, IntentsBitField, TextChannel } from 'discord.js';
import express from 'express';

require('dotenv').config({ path: '.env.tokens' });

class DiscordBot {
  client: Client;
  private channelId: string;
  private webhook: express.Express = express();
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;

  constructor() {
    this.channelId = process.env.DISCORD_CHANNEL_ID!;
    this.client = new Client({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages
      ]
    });

    this.setupWebhook();
    this.setupDiscordEvents();
  }

  private setupWebhook() {
    this.webhook = express();
    this.webhook.use(express.json());

    this.webhook.post('/webhook', async (req, res) => {
      console.log('Получен webhook запрос:', req.body);
      const { channelId, tag, nameChat, dateString } = req.body;

      try {
        if (nameChat) {
          await this.sendMessage(channelId, tag, nameChat, dateString);
          console.log('Сообщение успешно отправлено');
          res.status(200).send('Message sent');
        } else {
          console.log('Отсутствует параметр в сообщение');
          res.status(400).send('Parameter required');
        }
      } catch (error) {
        console.error('Ошибка при обработке webhook:', error);
        res.status(500).send('Internal server error');
      }
    });

    const port = process.env.WEBHOOK_PORT || 3000;
    this.webhook.listen(port, () => {
      console.log(`Webhook сервер запущен на порту ${port}`);
    });
  }

  private setupDiscordEvents() {
    this.client.on(Events.ClientReady, () => {
      console.log('Бот успешно подключен к Discord');
      this.reconnectAttempts = 0;
    });

    this.client.on(Events.Error, async (error) => {
      console.error('Ошибка Discord клиента:', error);
      await this.handleReconnect();
    });

    this.client.on('disconnect', async () => {
      console.log('Бот отключен от Discord');
      await this.handleReconnect();
    });
  }

  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Превышено максимальное количество попыток переподключения');
      process.exit(1);
    }

    this.reconnectAttempts++;
    console.log(`Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    try {
      await this.client.destroy();
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      console.error('Ошибка при переподключении:', error);
      setTimeout(() => this.handleReconnect(), 5000 * this.reconnectAttempts);
    }
  }

  async sendMessage(channelId: string, tag: string, nameChat: string, dateString: string) {
    try {
      const channel = await this.client.channels.fetch(channelId) as TextChannel;

      // Форматирование упоминания пользователя/роли
      const mention = tag.startsWith('role-')
        ? `<@&${tag.replace('role-', '')}>` // Для ролей (если `tag` начинается с "role-")
        : `<@${tag}>`; // Для пользователей

      await channel.send(
        `🚨🚨🚨 ${mention} 🚨🚨🚨\n` +
        `# 📢 Внимание! Объявлен сбор!\n` +
        `📌 В телеграмм чате: **"${nameChat}"**\n` +
        `🕒 Объявлено: *${dateString}*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🔥 Присоединяйтесь к сбору! 🔥`
      );

      console.log(`Сообщение отправлено в канал ${channel}`);
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      throw error;
    }
  }

  async start() {
    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      console.log('Бот запущен');
    } catch (error) {
      console.error('Ошибка запуска бота:', error);
      process.exit(1);
    }
  }
}

// Запуск бота
const bot = new DiscordBot();
bot.start();

// Обработка завершения работы
process.once('SIGINT', () => {
  console.log('Получен сигнал SIGINT');
  bot.client.destroy();
});
process.once('SIGTERM', () => {
  console.log('Получен сигнал SIGTERM');
  bot.client.destroy();
});