export type Hero = {
  id: number;
  name: string;
  alias: string;
  email: string;
  retiredYear: number;
};

export const heroes: Hero[] = [
  { id: 1, name: "Bob Dude",     alias: "Super Yellow",     email: "bob@super.com",   retiredYear: 2021 },
  { id: 2, name: "Jane Doe",     alias: "Wonder Great",     email: "jane@super.com",  retiredYear: 2019 },
  { id: 3, name: "Gary Normal",  alias: "Captain Adequate", email: "gary@super.com",  retiredYear: 2020 },
  { id: 4, name: "Linda Bland",  alias: "The Forgettable",  email: "linda@super.com", retiredYear: 2018 },
  { id: 5, name: "Frank Static", alias: "Idle Man",         email: "frank@super.com", retiredYear: 2022 },
  { id: 6, name: "Debra Mild",   alias: "Lady Average",     email: "debra@super.com", retiredYear: 2017 },
  { id: 7, name: "Phil Meh",     alias: "Beige Lightning",  email: "phil@super.com",  retiredYear: 2024 },
];

export const residents: Hero[] = [heroes[0], heroes[1]];
