import type { CommunityData, CommunityStory } from "./community-types";

/** Keep other people's state intact when one follow is changed or rolled back. */
export function communityWithFollowing(data: CommunityData, following: string[], restoredStories: CommunityStory[] = []): CommunityData {
  const ids = [...new Set(following)], selected = new Set(ids);
  const stories = [...new Map([...data.stories, ...restoredStories].map(story => [story.userId, story])).values()]
    .filter(story => selected.has(story.userId));
  return { ...data, following: ids, followingCount: ids.length, stories,
    people: data.people.map(person => ({ ...person, following: selected.has(person.id) })) };
}
