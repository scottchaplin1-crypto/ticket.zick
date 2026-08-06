import axios from "axios";

// No API key required for basic reads, but WOM asks that requests identify
// themselves with a User-Agent — using the project name is enough.
export const womApi = axios.create({
  baseURL: "https://api.wiseoldman.net/v2",
  headers: { "User-Agent": "TicketZick-DiscordBot" },
});

// Returns the group's display name and full member roster (username + role).
// Parsed defensively — WOM's response has been observed both flat and wrapped in
// a "group" key depending on endpoint/version, so we handle either.
export async function fetchGroup(womGroupId) {
  const { data } = await womApi.get(`/groups/${womGroupId}`);
  const group = data.group || data;
  return {
    name: group.name,
    members: (group.memberships || []).map((m) => ({
      username: m.player?.username,
      displayName: m.player?.displayName,
      role: m.role,
    })),
  };
}

// Normalizes an RSN for comparison — case, extra whitespace, and underscore-vs-space
// differences (OSRS names like "Iron Man" get typed as "Iron_Man" just as often as
// with a space) shouldn't matter when matching someone's typed RSN against the roster.
function normalizeRsn(str) {
  return (str || "").trim().toLowerCase().replace(/[_\s]+/g, " ");
}

// Finds a member by RSN, forgiving of the differences above.
export function findMember(members, rsn) {
  const normalized = normalizeRsn(rsn);
  return members.find((m) => normalizeRsn(m.username) === normalized || normalizeRsn(m.displayName) === normalized);
}
