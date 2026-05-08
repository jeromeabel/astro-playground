export type Hero = {
  id: number;
  name: string;
  alias: string;
  email: string;
  retiredYear: number;
};

export const heroes: Hero[] = [
  { id: 1,  name: "Steve Rogers",    alias: "Captain America",   email: "steve@rogers.com",     retiredYear: 2023 },
  { id: 2,  name: "Tony Stark",      alias: "Iron Man",          email: "tony@stark.com",       retiredYear: 2019 },
  { id: 3,  name: "Natasha Romanoff",alias: "Black Widow",       email: "natasha@romanoff.com", retiredYear: 2019 },
  { id: 4,  name: "Bruce Banner",    alias: "Hulk",              email: "bruce@banner.com",     retiredYear: 2023 },
  { id: 5,  name: "Clint Barton",    alias: "Hawkeye",           email: "clint@barton.com",     retiredYear: 2024 },
  { id: 6,  name: "Thor Odinson",    alias: "Thor",              email: "thor@odinson.com",     retiredYear: 2024 },
  { id: 7,  name: "Wanda Maximoff",  alias: "Scarlet Witch",     email: "wanda@maximoff.com",   retiredYear: 2025 },
  { id: 8,  name: "Scott Lang",      alias: "Ant-Man",           email: "scott@lang.com",       retiredYear: 2025 },
  { id: 9,  name: "Sam Wilson",      alias: "Captain America",   email: "sam@wilson.com",       retiredYear: 2025 },
  { id: 10, name: "Carol Danvers",   alias: "Captain Marvel",    email: "carol@danvers.com",    retiredYear: 2024 },
];

export const allowedEmails = new Set(heroes.map((h) => h.email));

// Pre-seeded residents — Steve is absent so his join can be demonstrated
export const residents: Hero[] = heroes.filter((h) =>
  ["tony@stark.com", "natasha@romanoff.com", "thor@odinson.com"].includes(h.email)
);
