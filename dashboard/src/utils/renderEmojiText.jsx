// Turns raw Discord custom emoji codes like <:name:123456789012345678> (or
// <a:name:...> for animated ones) into actual inline images, so the preview shows
// what people will really see instead of the literal code text. Discord's emoji
// CDN is public, so this needs no API calls — just the ID from the code itself.
const EMOJI_PATTERN = /<a?:(\w+):(\d+)>/g;

export function renderEmojiText(text) {
  if (!text) return text;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  const regex = new RegExp(EMOJI_PATTERN);
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const [full, name, id] = match;
    const animated = full.startsWith("<a:");
    parts.push(
      <img
        key={`emoji-${key++}`}
        src={`https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=32`}
        alt={`:${name}:`}
        title={`:${name}:`}
        className="inline-block w-[1.2em] h-[1.2em] align-text-bottom mx-0.5"
      />
    );
    lastIndex = match.index + full.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
