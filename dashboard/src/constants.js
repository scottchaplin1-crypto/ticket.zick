// Shared values used in more than one place — kept here so they can't quietly
// drift out of sync the way the invite permission integer did (it was
// duplicated in two files with an identical comment, an easy thing to update
// in one place and forget the other).

// Everything the bot actually needs across every feature: viewing/posting/
// embedding/attaching/reacting everywhere, managing ticket channels, assigning
// roles (auto-role, OSRS sync, ticket open/close, economy rewards), custom
// emoji management for reaction roles, editing its own sent messages, setting
// its own nickname (Bot Profile), and moderation (ban/kick/timeout). Not
// Administrator on purpose — see the conversation this was decided in for why.
export const BOT_INVITE_PERMISSIONS = 1100921302102;
