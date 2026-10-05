// Real catalog rows (accords as listed, strongest first) used to calibrate
// the accord tables: golden.test.ts asserts how well-known fragrances rank
// against each other on each dimension. Only accords and the family text are
// kept; nothing here is invented.
import type { CatalogRow } from "./profiles";

const r = (name: string, brand: string, accords: string, family: string): CatalogRow => ({ id: name, name, brand, accords: accords.split(","), olfactory_family: family });

export const GOLDEN: Record<string, CatalogRow> = {
  angel: r("Mugler Angel", "Mugler", "Sweet,Patchouli,Fruity,Warm Spicy,Caramel,Vanilla,Woody,Honey,Powdery,Chocolate", "Amber Vanilla"),
  lightBlue: r("Light Blue", "Dolce&Gabbana", "Citrus,Woody,Fresh,Fruity,Aromatic,Musky,Powdery,Green", "Floral Fruity"),
  cocoMlle: r("Coco Mademoiselle", "Chanel", "Citrus,Woody,Patchouli,Sweet,White Floral,Rose,Earthy,Vanilla,Warm Spicy,Yellow Floral", "Amber Floral"),
  blackOrchid: r("Black Orchid", "Tom Ford", "Warm Spicy,Earthy,Woody,Sweet,Amber,Patchouli,Chocolate,Floral,Balsamic,Powdery", "Amber Floral"),
  blackOpium: r("Black Opium", "Yves Saint Laurent", "Vanilla,Coffee,Sweet,Warm Spicy,White Floral,Soft Spicy,Woody,Fruity,Powdery,Balsamic", "Amber Vanilla"),
  jadore: r("J'adore", "Dior", "White Floral,Floral,Fruity,Sweet,Fresh,Aquatic,Citrus,Powdery,Ozonic,Tuberose", "Floral Fruity"),
  sauvage: r("Sauvage", "Dior", "Fresh Spicy,Amber,Citrus,Aromatic,Musky,Woody,Herbal,Lavender,Warm Spicy", "Aromatic Fougere"),
  tobaccoVanille: r("Tobacco Vanille", "Tom Ford", "Vanilla,Sweet,Tobacco,Warm Spicy,Fruity,Woody,Cacao,Powdery", "Amber Spicy"),
  terreHermes: r("Terre d'Hermès", "Hermès", "Citrus,Woody,Fresh Spicy,Aromatic,Earthy,Warm Spicy", "Woody Spicy"),
  eros: r("Eros", "Versace", "Vanilla,Aromatic,Green,Fresh Spicy,Amber,Fruity,Citrus,Sweet,Woody,Fresh", "Aromatic Fougere"),
  brc540: r("Baccarat Rouge 540", "Maison Francis Kurkdjian", "Woody,Amber,Warm Spicy,Fresh Spicy,Aromatic,Metallic,White Floral,Animalic", "Amber Floral"),
  brightCrystal: r("Bright Crystal", "Versace", "Floral,Citrus,Fresh,Woody,Fresh Spicy,Rose", "Floral Fruity"),
  chloe: r("Chloé Eau de Parfum", "Chloé", "Floral,Rose,Fresh,Fruity,White Floral", "Floral"),
  aventus: r("Aventus", "Creed", "Fruity,Sweet,Leather,Woody,Smoky,Citrus,Musky,Tropical,Fresh,Mossy", "Chypre Fruity"),
  nuitHomme: r("La Nuit de L'Homme", "Yves Saint Laurent", "Aromatic,Warm Spicy,Lavender,Woody,Fresh Spicy,Citrus", "Woody Spicy"),
  encreNoire: r("Encre Noire", "Lalique", "Woody,Aromatic,Earthy,Musky", "Woody Aromatic"),
  oneMillion: r("1 Million", "Paco Rabanne", "Warm Spicy,Cinnamon,Citrus,Amber,Woody,Leather,Rose,Animalic,Green,Patchouli", "Woody Spicy"),
  acquaDiGio: r("Acqua di Giò", "Giorgio Armani", "Citrus,Aromatic,Marine,Fresh Spicy,Floral,Woody,Fresh", "Aromatic Aquatic"),
  leMale: r("Le Male", "Jean Paul Gaultier", "Aromatic,Vanilla,Fresh Spicy,Lavender,Warm Spicy,Green,Powdery,Sweet,Amber,Cinnamon", "Amber Fougere"),
  fahrenheit: r("Fahrenheit", "Dior", "Leather,Woody,Ozonic,Fresh Spicy,Animalic,Aromatic,Aquatic,Floral,Citrus,Green", "Aromatic Fougere"),
  flowerbomb: r("Flowerbomb", "Viktor&Rolf", "Floral,Patchouli,White Floral,Woody,Citrus,Powdery,Sweet,Musky,Warm Spicy,Rose", "Amber Floral"),
  forHer: r("For Her", "Narciso Rodriguez", "Musky,Powdery,White Floral,Citrus,Floral,Fruity,Woody,Amber,Animalic,Sweet", "Floral Woody Musk"),
  bleu: r("Bleu de Chanel", "Chanel", "Citrus,Woody,Warm Spicy,Aromatic,Amber,Fresh Spicy,Smoky,Balsamic,Green,Musky", "Woody Aromatic"),
};
