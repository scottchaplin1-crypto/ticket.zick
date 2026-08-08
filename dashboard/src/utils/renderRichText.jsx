// Renders embed text (title, description, field values) the way Discord
// actually will — custom emoji codes as real images, and the markdown subset
// Discord embeds support (bold, italic, bold+italic, underline, strikethrough,
// inline code, links) as real formatting — instead of showing the raw
// characters, which made correctly-formatted text look "broken" in preview even
// when it would have posted correctly. Single combined pass so emoji and
// markdown can appear together in the same string, e.g. "**Welcome** <:wave:123>".
const TOKEN = new RegExp(
  [
    /<a?:\w+:\d+>/.source, // custom emoji
    /\[[^\]]+\]\(https?:\/\/[^\s)]+\)/.source, // [text](url)
    /\*\*\*[^*]+\*\*\*/.source, // ***bold italic***
    /\*\*[^*]+\*\*/.source, // **bold**
    /__[^_]+__/.source, // __underline__
    /~~[^~]+~~/.source, // ~~strikethrough~~
    /`[^`]+`/.source, // `code`
    /\*[^*]+\*/.source, // *italic*
  ].join("|"),
  "g"
);

export function renderRichText(text) {
  if (!text) return text;
  const parts = [];
  let lastIndex = 0;
  let key = 0;
  let match;
  const regex = new RegExp(TOKEN);
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(renderToken(match[0], key++));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderToken(token, key) {
  let m;
  if ((m = token.match(/^<(a?):(\w+):(\d+)>$/))) {
    return (
      <img
        key={key}
        src={`https://cdn.discordapp.com/emojis/${m[3]}.${m[1] === "a" ? "gif" : "png"}?size=32`}
        alt={`:${m[2]}:`}
        title={`:${m[2]}:`}
        className="inline-block w-[1.2em] h-[1.2em] align-text-bottom mx-0.5"
      />
    );
  }
  if ((m = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/))) {
    return (
      <a key={key} href={m[2]} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline" onClick={(e) => e.stopPropagation()}>
        {m[1]}
      </a>
    );
  }
  if ((m = token.match(/^\*\*\*(.+)\*\*\*$/))) {
    return (
      <strong key={key}>
        <em>{m[1]}</em>
      </strong>
    );
  }
  if ((m = token.match(/^\*\*(.+)\*\*$/))) return <strong key={key}>{m[1]}</strong>;
  if ((m = token.match(/^__(.+)__$/))) return <u key={key}>{m[1]}</u>;
  if ((m = token.match(/^~~(.+)~~$/))) return <s key={key}>{m[1]}</s>;
  if ((m = token.match(/^`(.+)`$/))) {
    return (
      <code key={key} className="bg-black/30 px-1 py-0.5 rounded text-[0.85em]">
        {m[1]}
      </code>
    );
  }
  if ((m = token.match(/^\*(.+)\*$/))) return <em key={key}>{m[1]}</em>;
  return token;
}
