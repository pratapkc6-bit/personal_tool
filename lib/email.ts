import type { gmail_v1 } from "googleapis";
import type { EmailClassification, Priority } from "@prisma/client";

function decodeBase64Url(value?: string | null) {
  if (!value) return "";
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function htmlToText(html: string) {
  return html
    .replace(/<\/(td|th|tr|p|div|li)>/gi, "\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function walkParts(part?: gmail_v1.Schema$MessagePart | null): string[] {
  if (!part) return [];
  const mime = part.mimeType ?? "";
  const body = decodeBase64Url(part.body?.data);
  const own =
    mime === "text/plain" ? body :
    mime === "text/html" ? htmlToText(body) :
    "";
  const children = (part.parts ?? []).flatMap(walkParts);
  return own ? [own, ...children] : children;
}

export function messageText(message: gmail_v1.Schema$Message) {
  return walkParts(message.payload).join("\n").trim();
}

export function header(message: gmail_v1.Schema$Message, name: string) {
  return (
    message.payload?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
  );
}

export function classifyEmail(input: {
  sender: string;
  subject: string;
  body: string;
}): {
  classification: EmailClassification;
  priority: Priority;
  requiresAction: boolean;
  whatHappened: string;
  whyItMatters: string;
  recommendedAction: string | null;
} {
  const text = `${input.sender} ${input.subject} ${input.body}`.toLowerCase();

  const security = /(security alert|new sign-in|password|verification code|suspicious|2-step)/.test(text);
  const lowValue = /(unsubscribe|newsletter|promotion|special offer|sale ends|marketing)/.test(text);
  const work = /(myob|roster|shift|ensign|darwin linen|workplace)/.test(text);
  const career = /(application|interview|recruiter|job|candidate|employer)/.test(text);
  const study = /(professional year|assessment|nit australia|class|course|attendance)/.test(text);
  const finance = /(invoice|payment|bank|statement|insurance|bill|receipt|refund)/.test(text);
  const actionWords = /(action required|please (reply|respond|complete|submit|confirm)|deadline|due by|needs your attention|roster updated)/.test(text);
  const waiting = /(we will get back|under review|pending|awaiting|we have received your application)/.test(text);

  let classification: EmailClassification = "INFORMATION";
  if (security) classification = "SECURITY";
  else if (lowValue) classification = "LOW_VALUE";
  else if (actionWords) classification = "ACTION_REQUIRED";
  else if (waiting) classification = "WAITING";
  else if (work) classification = "WORK";
  else if (career) classification = "CAREER";
  else if (study) classification = "STUDY";
  else if (finance) classification = "FINANCE";

  const requiresAction = classification === "ACTION_REQUIRED" || security;
  const priority: Priority =
    security ? "URGENT" :
    requiresAction ? "HIGH" :
    classification === "WAITING" ? "MEDIUM" :
    "LOW";

  const whatHappened = input.subject || "New email received";
  const whyItMatters =
    security ? "This may affect account security." :
    requiresAction ? "The message appears to require a response or follow-up." :
    classification === "WAITING" ? "A response or outcome is still pending." :
    "No immediate action was detected.";

  const recommendedAction =
    security ? "Review the security event directly in the relevant account." :
    /roster updated/.test(text) ? "Review and sync the new roster with Google Calendar." :
    requiresAction ? "Open the message, verify the request, and complete the required action." :
    classification === "WAITING" ? "Track this as a follow-up only if a response is expected." :
    null;

  return { classification, priority, requiresAction, whatHappened, whyItMatters, recommendedAction };
}
