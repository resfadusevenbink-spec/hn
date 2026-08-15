export const BOOKING_TIMES = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
] as const;

export const HENNA_MODELS = [
  {
    id: "mariage-mandala",
    name: "Mariée mandala",
    tag: "main complète",
    mood: "Grand dessin central, doigts fins, détails de mariée.",
    duration: "2h30",
    palette: "electric-orange",
  },
  {
    id: "khaleeji-fingers",
    name: "Khaleeji doigts",
    tag: "doigts",
    mood: "Lignes longues, petits points et rythme très fin.",
    duration: "1h",
    palette: "cobalt",
  },
  {
    id: "marrakech-floral",
    name: "Florale Marrakech",
    tag: "fleurs",
    mood: "Fleurs épaisses, feuilles serrées, effet bijou.",
    duration: "1h30",
    palette: "rose",
  },
  {
    id: "bracelet-lune",
    name: "Bracelet lune",
    tag: "poignet",
    mood: "Bracelet léger avec lune, gouttes et arabesques.",
    duration: "45 min",
    palette: "mint",
  },
  {
    id: "paume-soleil",
    name: "Paume soleil",
    tag: "mandala",
    mood: "Soleil de paume graphique, très visible en photo.",
    duration: "1h15",
    palette: "gold",
  },
  {
    id: "moucharabieh",
    name: "Moucharabieh",
    tag: "géométrique",
    mood: "Carrés, rosaces et détails inspirés des zelliges.",
    duration: "1h20",
    palette: "blue-orange",
  },
] as const;

export type HennaModel = (typeof HENNA_MODELS)[number];
export type BookingTime = (typeof BOOKING_TIMES)[number];
