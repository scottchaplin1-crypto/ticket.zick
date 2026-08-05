// Builds a simple, readable HTML transcript from a ticket channel's messages.
export function buildTranscriptHtml(channelName, messages) {
  const rows = messages
    .reverse()
    .map((m) => {
      const time = new Date(m.createdTimestamp).toLocaleString();
      const author = escapeHtml(m.author.tag);
      const content = escapeHtml(m.content || "(no text content)");
      const attachments = [...m.attachments.values()]
        .map((a) => `<div class="attachment"><a href="${a.url}" target="_blank">${escapeHtml(a.name)}</a></div>`)
        .join("");
      return `
        <div class="message">
          <div class="meta"><strong>${author}</strong> <span class="time">${time}</span></div>
          <div class="content">${content}</div>
          ${attachments}
        </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Transcript - ${escapeHtml(channelName)}</title>
<style>
  body { font-family: -apple-system, Segoe UI, sans-serif; background: #313338; color: #dbdee1; padding: 24px; }
  h1 { color: #fff; }
  .message { padding: 10px 0; border-bottom: 1px solid #3f4147; }
  .meta { color: #b5bac1; font-size: 13px; margin-bottom: 4px; }
  .time { margin-left: 8px; color: #80848e; }
  .content { white-space: pre-wrap; }
  .attachment a { color: #00a8fc; }
</style>
</head>
<body>
  <h1>Transcript: #${escapeHtml(channelName)}</h1>
  ${rows}
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
