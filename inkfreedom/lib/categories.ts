export type Category = {
  name: string;
  slug: string;
  blurb: string;
};

export const CATEGORIES: Category[] = [
  { name: "Fiction", slug: "fiction", blurb: "Novels and novellas that earn their last page." },
  { name: "Poetry", slug: "poetry", blurb: "Collections with a pulse, line by line." },
  { name: "Essays", slug: "essays", blurb: "Arguments, confessions, and long thoughts." },
  { name: "Memoir", slug: "memoir", blurb: "Lives told without flinching." },
  { name: "Business", slug: "business", blurb: "How work actually gets done." },
  { name: "Self & Wellbeing", slug: "self-wellbeing", blurb: "Attention, rest, and repair." },
  { name: "History", slug: "history", blurb: "The past, told plainly." },
  { name: "Culture", slug: "culture", blurb: "Music, film, food, and the internet." },
  { name: "Technology", slug: "technology", blurb: "Tools, systems, and their consequences." },
  { name: "Children", slug: "children", blurb: "Books for younger readers and their adults." },
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

export function categoryDescription(name: string) {
  return CATEGORIES.find((c) => c.name === name)?.blurb ?? "New writing, freshly published.";
}
