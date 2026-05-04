export type Hero = {
  id: number;
  name: string;
  alias: string;
  email: string;
  retiredYear: number;
};

export const heroes: Hero[] = [
  { id: 1, name: "Steve Rogers",     alias: "Captain America", email: "steve@rogers.com",   retiredYear: 2023 },
  { id: 2, name: "Tony Stark",       alias: "Iron Man",        email: "tony@stark.com",     retiredYear: 2019 },
  { id: 3, name: "Natasha Romanoff", alias: "Black Widow",     email: "natasha@romanoff.com", retiredYear: 2019 },
  { id: 4, name: "Clint Barton",     alias: "Hawkeye",         email: "clint@barton.com",   retiredYear: 2024 },
  { id: 5, name: "Bruce Banner",     alias: "Hulk",            email: "bruce@banner.com",   retiredYear: 2023 },
];

export const allowedEmails = new Set(heroes.map((h) => h.email));
