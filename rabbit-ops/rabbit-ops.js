const amqp = require("amqplib");

let channel = null;

const connectRabbit = async () => {
  try {
    const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";

    const connection = await amqp.connect(RABBIT_URL);
    channel = await connection.createChannel();
    console.log("✔ RabbitMQ connected");

    await channel.assertQueue("user_events", { durable: true });
  } catch (err) {
    console.error(" Failed to connect RabbitMQ:", err.message);
    console.error(" Continuing without RabbitMQ (events will be skipped).");
  }
};

connectRabbit();

const rabbitPublisher = async (msg) => {
  try {
    if (!channel) {
      console.warn("⚠ RabbitMQ not connected. Event skipped.");
      return;
    }

    channel.sendToQueue("user_events", Buffer.from(msg));
    console.log("Event sent to RabbitMQ:", msg);

  } catch (err) {
    console.error("Rabbit publish error:", err.message);
  }
};

module.exports = { rabbitPublisher };
