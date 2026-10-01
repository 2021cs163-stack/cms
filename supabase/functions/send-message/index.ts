import { z } from "npm:zod@4";
import { authorize, body, headers, response } from "../_shared/security.ts";
Deno.serve(async (req) => {
  let cors: Record<string, string> = {};
  try {
    cors = headers(req);
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST")
      return response({ error: "Method not allowed" }, 405, cors);
    const { client, user } = await authorize(req);
    const { message_id } = z
      .object({ message_id: z.uuid() })
      .parse(await body(req));
    const { data: message, error } = await client
      .from("messages")
      .select("*")
      .eq("id", message_id)
      .single();
    if (error || !message) throw new Error("Message not found");
    if (message.status !== "draft")
      throw new Error(
        "Only drafts can be submitted. Check the provider before retrying an uncertain delivery.",
      );
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID"),
      token = Deno.env.get("TWILIO_AUTH_TOKEN");
    const from = Deno.env.get(
      message.channel === "WhatsApp"
        ? "TWILIO_WHATSAPP_FROM"
        : "TWILIO_SMS_FROM",
    );
    if (!sid || !token || !from)
      throw new Error(
        "Provider secrets are not configured. The message remains a draft.",
      );
    if (/\{\w+\}/.test(message.message))
      throw new Error("Unresolved template placeholders");
    const { data: claimed, error: claimError } = await client
      .from("messages")
      .update({ status: "sending" })
      .eq("id", message_id)
      .eq("status", "draft")
      .select("id");
    if (claimError || !claimed?.length)
      throw new Error("Message is already being processed");
    let result: Response;
    try {
      result = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(sid + ":" + token),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From:
              message.channel === "WhatsApp"
                ? from.startsWith("whatsapp:")
                  ? from
                  : "whatsapp:" + from
                : from,
            To:
              (message.channel === "WhatsApp" ? "whatsapp:" : "") +
              message.recipient,
            Body: message.message,
          }),
          signal: AbortSignal.timeout(20000),
        },
      );
    } catch {
      await client
        .from("messages")
        .update({
          status: "unknown",
          error:
            "Provider response timed out. Verify delivery in the provider console before sending a replacement.",
        })
        .eq("id", message_id);
      throw new Error(
        "Delivery status is unknown. Check the provider console before creating another message.",
      );
    }
    const provider = await result.json();
    if (!result.ok) {
      await client
        .from("messages")
        .update({
          status: "failed",
          error: String(provider.message || "Provider rejected message").slice(
            0,
            500,
          ),
        })
        .eq("id", message_id);
      throw new Error(
        "Provider rejected the message. Review the message and provider configuration.",
      );
    }
    const { error: updateError } = await client
      .from("messages")
      .update({ status: "sent", provider_id: provider.sid, error: null })
      .eq("id", message_id);
    if (updateError)
      throw new Error(
        "Provider accepted the message but status could not be saved. Check the provider console; do not resend.",
      );
    await client
      .from("activity")
      .insert({
        actor: user.email,
        action: "submitted notification to provider",
        resource: "messages",
        record_id: message_id,
      });
    return response(
      {
        status: "sent",
        provider_id: provider.sid,
        message:
          "Accepted by provider; final delivery is available in the provider console.",
      },
      200,
      cors,
    );
  } catch (error) {
    return response(
      { error: error instanceof Error ? error.message : "Request failed" },
      400,
      cors,
    );
  }
});
