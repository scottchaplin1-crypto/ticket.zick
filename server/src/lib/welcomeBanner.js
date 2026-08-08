import { createCanvas, loadImage } from "@napi-rs/canvas";

const WIDTH = 1024;
const HEIGHT = 400;
const AVATAR_SIZE = 160;

// Generates a MEE6-style welcome banner: either a background image (with a dark
// overlay for text readability) or a flat color, the joining member's avatar cut
// into a circle, their "just joined" title, and a member-count line — all
// customizable colors. Returns a PNG buffer ready to attach directly to a
// Discord message.
export async function generateWelcomeBanner({
  backgroundUrl,
  backgroundColor,
  avatarUrl,
  title,
  memberCount,
  textColor,
  accentColor,
  overlayOpacity,
}) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  const fallbackColor = backgroundColor || "#2b2d31";

  if (backgroundUrl) {
    try {
      const bg = await loadImage(backgroundUrl);
      ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
      // Dark wash over the image so text stays readable — strength is configurable,
      // since a busy or already-dark image might need less (or more) of it.
      const opacity = Math.min(100, Math.max(0, overlayOpacity ?? 45)) / 100;
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    } catch {
      // Bad/missing background URL — fall back to the flat color rather than
      // failing the whole banner.
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  } else {
    // No image configured at all — just use the flat background color.
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const avatarX = WIDTH / 2;
  const avatarY = 130;

  try {
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX - AVATAR_SIZE / 2, avatarY - AVATAR_SIZE / 2, AVATAR_SIZE, AVATAR_SIZE);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(avatarX, avatarY, AVATAR_SIZE / 2 + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.stroke();
  } catch {
    // If the avatar fails to load, just skip drawing it rather than failing
    // the whole banner over one bad image.
  }

  ctx.textAlign = "center";
  ctx.fillStyle = textColor || "#ffffff";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText(title, WIDTH / 2, avatarY + AVATAR_SIZE / 2 + 60, WIDTH - 80);

  ctx.font = "28px sans-serif";
  ctx.fillStyle = accentColor || "#5ee6c8";
  ctx.fillText(`Member #${memberCount}`, WIDTH / 2, avatarY + AVATAR_SIZE / 2 + 105);

  return canvas.toBuffer("image/png");
}
