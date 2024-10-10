import 'express-async-errors';
import { winstonLogger } from '@ChyYasir/jobwave-shared';
import { Logger } from 'winston';
import http from 'http';

import { config } from '@notifications/config';
import { Application } from 'express';

import { healthRoutes } from '@notifications/routes';
import { checkConnection } from '@notifications/elasticserach';
import { createConnection } from '@notifications/queues/connection';
import { Channel } from 'amqplib';
import { consumeAuthEmailMessages, consumeOrderEmailMessages } from '@notifications/queues/email.consumer';

const SERVER_PORT = 4001;
const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'notificationServer', 'debug');

export function start(app: Application): void {
  startServer(app);

  app.use('', healthRoutes());
  startQueues();
  startElasticSearch();
}

async function startQueues(): Promise<void> {
  const emailChannel: Channel = (await createConnection()) as Channel;
  await consumeAuthEmailMessages(emailChannel);
  await consumeOrderEmailMessages(emailChannel);
  // producing a dummy message
  await emailChannel.assertExchange('jobber-email-notification', 'direct');
  const messageAuth = JSON.stringify({ name: 'jobwave', service: 'auth notification service' });
  emailChannel.publish('jobber-email-notification', 'auth-email', Buffer.from(messageAuth));

  await emailChannel.assertExchange('jobber-order-notification', 'direct');
  const messageOrder = JSON.stringify({ name: 'jobwave', service: 'order notification service' });
  emailChannel.publish('jobber-order-notification', 'order-email', Buffer.from(messageOrder));
}

function startElasticSearch(): void {
  checkConnection();
}

function startServer(app: Application): void {
  try {
    const httpServer: http.Server = new http.Server(app);
    log.info(`Worker with process id of ${process.pid} on notification server has started`);
    httpServer.listen(SERVER_PORT, () => {
      log.info(`Notification server running on port ${SERVER_PORT}`);
    });
  } catch (error) {
    log.log('error', 'NotificationService startServer() method', error);
  }
}
