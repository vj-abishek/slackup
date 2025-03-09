const CLICKUP_BASE_URL = `https://api.clickup.com/api/v2`;
const AUTH_TOKEN = process.env.CLICKUP_TOKEN;
const WORKSPACE_ID = process.env.CLICKUP_WORKSPACE_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

export const getParentMessage = async (client, channel, ts) => {
  const response = await client.conversations.history({
    channel,
    latest: ts,
    inclusive: true,
    limit: 1,
  });
  return response.messages[0] || null;
};

export const createClickUpTask = async (
  listId,
  taskName,
  taskDescription,
  taskTags,
  taskStatus,
) => {
  const url = `${CLICKUP_BASE_URL}/list/${listId}/task`;

  const payload = {
    name: taskName,
    description: taskDescription,
    tags: taskTags,
    status: taskStatus,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: AUTH_TOKEN,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return await response.json();
  } catch (error) {
    console.error("Error creating ClickUp task:", error);
    throw error;
  }
};

export const createComment = async (taskId, commentText) => {
  const url = `${CLICKUP_BASE_URL}/task/${taskId}/comment`;

  const payload = {
    notify_all: false,
    comment_text: commentText,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: AUTH_TOKEN,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return await response.json();
  } catch (error) {
    console.error("Error adding comment to ClickUp task:", error);
    throw error;
  }
};

export const createWebhook = async (taskId) => {
  const url = `${CLICKUP_BASE_URL}/team/${WORKSPACE_ID}/webhook`;

  const payload = {
    endpoint: WEBHOOK_URL,
    events: ["taskUpdated", "taskCommentPosted"],
    task_id: taskId,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: AUTH_TOKEN,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("✅ Created ClickUp webhook:", data);
    return data;
  } catch (error) {
    console.error("Error creating ClickUp webhook:", error);
    throw error;
  }
};

export const deleteWebhook = async (webhookId) => {
  const url = `${CLICKUP_BASE_URL}/webhook/${webhookId}`;

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: AUTH_TOKEN,
        Accept: "application/json",
      },
    });

    return await response.json();
  } catch (error) {
    console.error("Error deleting ClickUp webhook:", error);
    throw error;
  }
};

export const parseSlackMessage = (message) => {
  if (!message?.blocks?.length) {
    return null;
  }

  for (const block of message.blocks) {
    if (block.elements) {
      for (const element of block.elements) {
        if (element.type === "rich_text_section" && element.elements) {
          for (const subElement of element.elements) {
            if (subElement.type === "text") {
              const firstLine = subElement.text.split("\n")[0];
              return firstLine.trim();
            }
          }
        }
      }
    }
  }

  return "";
};

export const getFileUrl = (message) => {
  if (!message?.files?.length) {
    return "";
  }
  return `\n\n${message.files.map((file) => file.url_private)}`;
};
