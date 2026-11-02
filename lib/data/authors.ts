import type { Author } from "./types";

/**
 * Placeholder author profiles.
 * These are fictional profiles created for the preview build — they do not
 * describe real people, awards, or sales.
 */
export const authors: Author[] = [
  {
    slug: "adaeze-nwosu",
    name: "Adaeze Nwosu",
    tagline: "Novelist of the family table and the city that surrounds it",
    bio: [
      "Adaeze Nwosu writes fiction about inheritance — what families carry, what they quietly put down, and what gets lost between one generation and the next. Her prose is patient and close to the ground, often built from the ordinary business of cooking, commuting and negotiating.",
      "She is a placeholder profile created for this preview build of the INKFREEDOMPUBLISHING catalogue.",
    ],
    based: "Lagos, Nigeria",
    writingIn: "Literary fiction",
    categories: ["literary-fiction"],
    featured: true,
    initials: "AN",
  },
  {
    slug: "tomas-ferreira",
    name: "Tomás Ferreira",
    tagline: "Poet of harbours, weather, and the space between languages",
    bio: [
      "Tomás Ferreira writes short, spare poems about coastlines, translation and the small hours. His collections are arranged like tide tables — recurring images returning at wider intervals.",
      "He is a placeholder profile created for this preview build of the INKFREEDOMPUBLISHING catalogue.",
    ],
    based: "Lisbon, Portugal",
    writingIn: "Poetry and translation",
    categories: ["poetry"],
    featured: true,
    initials: "TF",
  },
  {
    slug: "miriam-okonjo",
    name: "Miriam Okonjo",
    tagline: "Essayist on art, cities and the public good",
    bio: [
      "Miriam Okonjo writes essays that begin with something small — a shopfront, a bus route, a museum label — and end somewhere larger. Her work favours the long sentence and the qualified claim.",
      "She is a placeholder profile created for this preview build of the INKFREEDOMPUBLISHING catalogue.",
    ],
    based: "Abuja, Nigeria",
    writingIn: "Essays and criticism",
    categories: ["essays-criticism", "memoir"],
    featured: true,
    initials: "MO",
  },
  {
    slug: "june-halvorsen",
    name: "June Halvorsen",
    tagline: "Memoirist of work, weather and northern light",
    bio: [
      "June Halvorsen's writing sits between memoir and reportage. She is interested in labour, solitude and the routines people build to keep both in balance.",
      "She is a placeholder profile created for this preview build of the INKFREEDOMPUBLISHING catalogue.",
    ],
    based: "Bergen, Norway",
    writingIn: "Memoir and reportage",
    categories: ["memoir", "essays-criticism"],
    featured: true,
    initials: "JH",
  },
  {
    slug: "kwame-boateng",
    name: "Kwame Boateng",
    tagline: "Writes about enterprise, stewardship and long institutions",
    bio: [
      "Kwame Boateng writes practical books for people building organisations — on decision-making, stewardship and what it takes to keep a promise to a customer over many years.",
      "He is a placeholder profile created for this preview build of the INKFREEDOMPUBLISHING catalogue.",
    ],
    based: "Accra, Ghana",
    writingIn: "Business and leadership",
    categories: ["business-leadership"],
    initials: "KB",
  },
  {
    slug: "priya-raghunathan",
    name: "Priya Raghunathan",
    tagline: "Illustrator and storyteller for young readers",
    bio: [
      "Priya Raghunathan writes and illustrates picture books and early readers, with a particular interest in maps, animals and the way children explain the world to themselves.",
      "She is a placeholder profile created for this preview build of the INKFREEDOMPUBLISHING catalogue.",
    ],
    based: "Chennai, India",
    writingIn: "Children's books",
    categories: ["children-young-readers"],
    initials: "PR",
  },
];

export const getAuthor = (slug: string) =>
  authors.find((author) => author.slug === slug);
