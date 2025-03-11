import "dotenv/config";
import pkg from "@slack/bolt";
import express from "express";
const { App } = pkg;
import {
  insertSubscription,
  getSubscription,
  deleteSubscription,
  updateSubscription,
  storeWebhookId,
  getSubscriptionByClickupId,
  updateSubscriptionWebhook,
} from "./db.js";
import { nanoid } from "nanoid";
import {
  getParentMessage,
  createClickUpTask,
  parseSlackMessage,
  getFileUrl,
  createComment,
  createWebhook,
  deleteWebhook,
} from "./helper.js";
import { summarizeText } from "./generative.js";

const config = {
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  subscribeEmoji: "eyes",
  unsubscribeEmoji: "x",
  port: process.env.PORT || 3000,
  exporessPort: process.env.EXPRESS_PORT || 3001,
  projectId: process.env.CLICKUP_BOARD_ID,
  tags: ["support"],
  taskType: "Todo",
};

const handleSubscription = async (payload, action) => {
  switch (action) {
    case "check":
      const subscription = await getSubscription(payload);
      console.log("🔔 Found subscription:", subscription);
      return subscription;
    case "create":
      if (payload?.subscription_id) {
        await insertSubscription(payload);
        console.log("🔔 Created subscription:", payload);
      }
      break;
    case "delete":
      const response = await deleteSubscription(payload);
      console.log("🔔 Deleted subscription:", payload);
      return response;
  }
};

// Initialize app
const app = new App(config);
const expressApp = express();
expressApp.use(express.json());

// Event handlers
const handleMessage = async ({ message, client }) => {
  console.log("📩 New message received:", message.ts);

  if (message.thread_ts && message.ts !== message.thread_ts) {
    console.log("🔄 This is a thread reply.");
    try {
      const replyResponse = await client.conversations.replies({
        channel: message.channel,
        ts: message.thread_ts,
        limit: 1,
      });
      if (replyResponse.messages.length > 0) {
        const subscription = await handleSubscription(
          replyResponse.messages[0].ts,
          "check",
        );
        if (subscription) {
          const userInfo = await client.users.info({ user: message.user });
          const username = userInfo.user.real_name || userInfo.user.name;
          // createComment(
          //   subscription.clickup_id,
          //   `_~${username}_ \n${message.text}`,
          // );
        }
      }
    } catch (error) {
      console.error("❌ Error fetching parent message:", error);
    }
  }
};

const handleReactionAdded = async ({ event, client }) => {
  if (event.reaction === config.subscribeEmoji) {
    try {
      const parentMessage = await getParentMessage(
        client,
        event.item.channel,
        event.item.ts,
      );
      if (parentMessage) {
        const subscription = await handleSubscription(
          parentMessage.ts,
          "check",
        );

        if (subscription) {
          const webhookResponse = await createWebhook(subscription.clickup_id);
          await updateSubscriptionWebhook(
            parentMessage.ts,
            webhookResponse.id,
            true,
          );
        } else if (!subscription) {
          const taskTitle = await summarizeText(parentMessage.text);
          const uuid = nanoid(10);
          const slackMessageUrl = `https://slack.com/archives/${event.item.channel}/p${parentMessage.ts.replace(".", "")}`;
          const taskDescription = `Slack Message: ${slackMessageUrl} \n\n${parentMessage.text} ${getFileUrl(parentMessage)}`;

          const response = await createClickUpTask(
            config.projectId,
            taskTitle,
            taskDescription,
            config.tags,
            config.taskType,
          );
          console.log("🚀 Created ClickUp task:", response.url);

          await client.chat.postMessage({
            channel: event.item.channel,
            thread_ts: parentMessage.ts,
            text: `_Created ClickUp task: ${response.url} _`,
          });

          const payload = {
            subscription_id: parentMessage.ts,
            clickup_id: response.id,
            channel: event.item.channel,
            uuid,
          };
          // const webhookResponse = await createWebhook(response.id);
          await handleSubscription(payload, "create");
          await storeWebhookId(payload.subscription_id, webhookResponse.id);
        }
      }
    } catch (error) {
      console.error(error);
    }
  } else if (event.reaction === config.unsubscribeEmoji) {
    handleReactionRemoved({ event, client });
  }
};

const handleReactionRemoved = async ({ event, client }) => {
  try {
    const parentMessage = await getParentMessage(
      client,
      event.item.channel,
      event.item.ts,
    );
    if (parentMessage) {
      await updateSubscription(parentMessage.ts, false);
      const response = await getSubscription(parentMessage.ts);
      // await deleteWebhook(response.webhook_id);
      // await client.chat.postMessage({
      //   channel: event.item.channel,
      //   thread_ts: parentMessage.ts,
      //   text: `_Unsubscribed ClickUp task subscription_`,
      // });
    }
  } catch (error) {
    console.error(error);
  }
};
const handleWebhook = async (req, res) => {
  let webhookData = req.body;

  if (
    webhookData.event === "taskUpdated" &&
    webhookData.history_items &&
    webhookData.history_items[0]?.field === "status"
  ) {
    const subscription = await getSubscriptionByClickupId(webhookData.task_id);
    const taskStatus = webhookData.history_items[0];
    if (subscription) {
      await app.client.chat.postMessage({
        channel: subscription.channel,
        thread_ts: subscription.subscription_id,
        text: `_Status changed from *${taskStatus.before.status}* to *${taskStatus.after.status}*_`,
      });
    }
  } else if (
    webhookData.event === "taskCommentPosted" &&
    webhookData.history_items &&
    webhookData.history_items[0]?.field === "comment"
  ) {
    const subscription = await getSubscriptionByClickupId(webhookData.task_id);
    const commentText = webhookData.history_items[0].comment.text_content;
    if (subscription && !commentText.startsWith("_~")) {
      const user = webhookData.history_items[0].user;
      const username = user.username;
      const comment = webhookData.history_items[0].comment;

      let finalText = "";
      let hasImage = false;
      let imageData = null;

      comment.comment.forEach((item) => {
        if (item.type === "image") {
          hasImage = true;
          imageData = item.image;
        } else if (item.text !== "\n") {
          finalText += item.text;
        }
      });
      
      return

      if (hasImage) {
        await app.client.chat.postMessage({
          channel: subscription.channel,
          thread_ts: subscription.subscription_id,
          text: `_~${username}_ \n${finalText}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `_~${username}_ \n${finalText}`,
              },
            },
            {
              type: "image",
              image_url: imageData.thumbnail_large,
              alt_text: imageData.name,
            },
          ],
        });
      } else {
        await app.client.chat.postMessage({
          channel: subscription.channel,
          thread_ts: subscription.subscription_id,
          text: `_~${username}_ \n${finalText}`,
        });
      }
    }
  }

  res.status(200).send("OK");
};

app.event("message", handleMessage);
app.event("reaction_added", handleReactionAdded);
// app.event("reaction_removed", handleReactionRemoved);
expressApp.post("/webhook", handleWebhook);

expressApp.listen(config.exporessPort, () => {
  console.log(`listening on port ${config.exporessPort}`);
});

(async () => {
  await app.start(config.port);
  app.logger.info("⚡️ Bolt app is running!");
})();
