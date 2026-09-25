import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE;
const ADMIN_KEY = process.env.ADMIN_KEY;

const json = (status, body) => ({
  statusCode: status,
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

export const handler = async (event) => {
  const method = event.requestContext.http.method;
  const path = event.rawPath;
  const isAdmin = event.headers?.["x-admin-key"] === ADMIN_KEY;
  let body = {};
  if (event.body) {
    try { body = JSON.parse(event.body); } catch { return json(400, { error: "invalid json" }); }
  }
  // honeypot: 봇이 채우는 숨김 필드
  if (body.website) return json(200, { ok: true });

  try {
    if (method === "POST" && path === "/rsvp") {
      const name = clean(body.name, 30);
      const attending = body.attending === true || body.attending === "yes";
      const count = Math.min(10, Math.max(0, parseInt(body.count, 10) || 0));
      const meal = body.meal === true || body.meal === "yes";
      const note = clean(body.note, 200);
      if (!name) return json(400, { error: "name required" });
      const createdAt = new Date().toISOString();
      await db.send(new PutCommand({
        TableName: TABLE,
        Item: { pk: "rsvp", sk: `${createdAt}#${randomUUID()}`, name, attending, count, meal, note, createdAt },
      }));
      return json(200, { ok: true });
    }

    if (method === "GET" && path === "/rsvp") {
      if (!isAdmin) return json(403, { error: "forbidden" });
      const r = await db.send(new QueryCommand({
        TableName: TABLE, KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "rsvp" },
      }));
      const items = r.Items ?? [];
      const summary = {
        total: items.length,
        attending: items.filter((i) => i.attending).length,
        guests: items.filter((i) => i.attending).reduce((s, i) => s + (i.count || 0), 0),
      };
      return json(200, { summary, items });
    }

    if (method === "POST" && path === "/guestbook") {
      const name = clean(body.name, 20);
      const message = clean(body.message, 200);
      if (!name || !message) return json(400, { error: "name and message required" });
      const createdAt = new Date().toISOString();
      const id = `${createdAt}#${randomUUID()}`;
      await db.send(new PutCommand({ TableName: TABLE, Item: { pk: "guestbook", sk: id, name, message, createdAt } }));
      return json(200, { ok: true, id });
    }

    if (method === "GET" && path === "/guestbook") {
      const r = await db.send(new QueryCommand({
        TableName: TABLE, KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": "guestbook" },
        ScanIndexForward: false, Limit: 100,
      }));
      return json(200, { items: (r.Items ?? []).map(({ sk, name, message, createdAt }) => ({ id: sk, name, message, createdAt })) });
    }

    if (method === "DELETE" && path.startsWith("/guestbook/")) {
      if (!isAdmin) return json(403, { error: "forbidden" });
      const id = decodeURIComponent(event.pathParameters?.id ?? "");
      await db.send(new DeleteCommand({ TableName: TABLE, Key: { pk: "guestbook", sk: id } }));
      return json(200, { ok: true });
    }

    return json(404, { error: "not found" });
  } catch (e) {
    console.error(e);
    return json(500, { error: "internal" });
  }
};
