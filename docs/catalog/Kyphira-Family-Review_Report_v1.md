# Family review: the 200 most popular fragrances, before and after

Kyphira catalogue, migration 0038, 2026-11-14. On staging now. Production is unchanged until you say go.

## What you are deciding

Whether the new family rule goes to production. It would change the family of about 24,900 of 81,860 catalogue rows. The rest keep the family they have.

## The rule

1. Each accord votes for one of the five families. Accords are stored strongest first, so the first counts most and each one after counts less.
2. Sweet, powdery, fruity, aromatic, fresh and fresh spicy count half. They turn up on nearly everything.
3. The stated olfactory group ("Amber Woody", "Aromatic Fougere") adds one more vote, as strong as a leading accord. 72,000 rows have one.
4. Most points wins.

This is not the "main accord first" rule from my plan. That one, tested, put Baccarat Rouge 540 in Woody and both Bleu de Chanel rows in Fresh. The rule that sits in the database today is worse: it would put 47% of the catalogue in Gourmand.

## What a family change does

- Sets the default oil density and default strength when someone starts a new blend with that oil.
- Changes the family label and colour on the oil.
- Does not touch batches already logged: each batch keeps the family it was made with.
- Does not change rest days: every family rests 90 days.

Fresh 0.87 g/mL at 20%, Floral 0.95 at 25%, Woody 0.93 at 22%, Amber 1.02 at 30%, Gourmand 1.00 at 25%. A measured density still wins.

## The whole catalogue (staging)

| Family | Before | After |
|---|---|---|
| Fresh | 26,222 | 20,019 |
| Floral | 17,495 | 26,180 |
| Woody | 7,469 | 15,394 |
| Amber | 19,842 | 13,339 |
| Gourmand | 10,795 | 6,891 |

## The top 200

134 keep their family. 66 change.

### Unchanged, a sample from the top sixty

Alien (Amber), Angel (Gourmand), Light Blue (Fresh), La Vie Est Belle (Gourmand), Black Opium (Gourmand), Hypnotic Poison (Gourmand), J'adore (Floral), Sauvage (Fresh), Tobacco Vanille (Gourmand), Crystal Noir (Amber), Eros (Fresh), Baccarat Rouge 540 (Amber), Bright Crystal (Floral), Chloé Eau de Parfum (Floral), Encre Noire (Woody), 1 Million (Amber), Acqua di Giò (Fresh), Le Male (Amber), Fahrenheit (Fresh), Flowerbomb (Floral), Narciso Rodriguez For Her (Floral), Chance Eau Tendre (Floral), CK One (Fresh), Shalimar (Amber), Versace Pour Homme (Fresh), Pure Poison (Floral), Cool Water (Fresh), Prada Candy (Gourmand), Y Eau de Parfum (Fresh), DKNY Be Delicious (Fresh), Poison (Amber), Acqua di Gioia (Fresh), L'Eau d'Issey Pour Homme (Fresh), Hypnôse (Gourmand).

### The 66 that change

Rank is by popularity. A question mark marks the ones I would look at twice.

| Rank | Fragrance | Before | After | Stated group | Leading accords |
|---|---|---|---|---|---|
| 6 | Chanel Coco Mademoiselle ? | Floral | Woody | Amber Floral | Citrus, Woody, Patchouli, Sweet |
| 8 | Tom Ford Black Orchid | Gourmand | Amber | Amber Floral | Warm Spicy, Earthy, Woody, Sweet |
| 14 | Hermès Terre d'Hermès | Fresh | Woody | Woody Spicy | Citrus, Woody, Fresh Spicy, Aromatic |
| 17 | Calvin Klein Euphoria | Gourmand | Amber | Amber Floral | Woody, Floral, Sweet, Powdery |
| 21 | Creed Aventus | Floral | Woody | Chypre Fruity | Fruity, Sweet, Leather, Woody |
| 22 | Yves Saint Laurent La Nuit de L'Homme ? | Amber | Fresh | Woody Spicy | Aromatic, Warm Spicy, Lavender, Woody |
| 25 | Paco Rabanne One Million | Gourmand | Amber | Woody Spicy | Warm Spicy, Cinnamon, Citrus, Amber |
| 29 | Dior Homme Intense | Amber | Woody | Woody Amber | Amber, Woody |
| 30 | Dior Homme Intense 2011 | Floral | Woody | Woody Floral Musk | Iris, Woody, Powdery, Earthy |
| 33 | Bleu de Chanel | Fresh | Woody | Woody Aromatic | Citrus, Woody, Warm Spicy, Aromatic |
| 34 | Chanel Bleu de Chanel | Amber | Woody | Woody Aromatic | Citrus, Woody, Warm Spicy, Aromatic |
| 35 | Carolina Herrera Good Girl | Gourmand | Amber | Amber Floral | Sweet, White Floral, Warm Spicy, Vanilla |
| 37 | Giorgio Armani Si | Floral | Woody | Chypre Fruity | Woody, Vanilla, Aromatic, Soft Spicy |
| 40 | Armaf Club de Nuit Intense Man | Fresh | Woody | Woody Spicy | Citrus, Fruity, Leather, Smoky |
| 45 | Versace Pour Homme Dylan Blue | Amber | Fresh | Aromatic Fougere | Amber, Citrus, Fresh Spicy, Musky |
| 46 | Lanvin Eclat d’Arpège | Fresh | Floral | Floral Fruity | Floral, Fresh, Green |
| 48 | Dolce&Gabbana The One | Gourmand | Amber | Amber Floral | Fruity, White Floral, Vanilla, Powdery |
| 49 | Lolita Lempicka Lolita Lempicka | Amber | Gourmand | Floral Fruity Gourmand | Soft Spicy, Sweet, Powdery, Anis |
| 50 | Maison Martin Margiela By the Fireplace | Amber | Woody | Woody | Woody, Vanilla, Balsamic, Warm Spicy |
| 57 | Dior Addict | Gourmand | Amber | Amber Floral | Vanilla, White Floral, Sweet, Fruity |
| 58 | Yves Saint Laurent Libre ? | Floral | Fresh | Amber Fougere | White Floral, Citrus, Lavender, Vanilla |
| 62 | Chanel Chance Eau Fraiche | Fresh | Woody | Chypre Floral | Woody, Citrus, Aromatic, Floral |
| 66 | Giorgio Armani Armani Code for Women | Gourmand | Floral | Floral | Citrus, White Floral, Sweet, Vanilla |
| 67 | Guerlain Mon Guerlain | Floral | Amber | Amber Woody | Vanilla, Lavender, Woody, Aromatic |
| 68 | Chanel Bleu de Chanel Eau de Parfum | Amber | Woody | Woody Aromatic | Citrus, Amber, Woody, Warm Spicy |
| 71 | Lancôme Miracle | Fresh | Floral | Floral | Floral, Citrus, Warm Spicy, Fresh Spicy |
| 75 | Paco Rabanne Lady Million | Gourmand | Floral | Floral Fruity | White Floral, Sweet, Honey, Citrus |
| 78 | Tom Ford Oud Wood | Woody | Amber | Amber Woody | Woody, Oud, Warm Spicy, Aromatic |
| 80 | Jean Paul Gaultier Ultra Male | Gourmand | Amber | Amber Fougere | Vanilla, Fruity, Sweet, Aromatic |
| 86 | Paco Rabanne Olympéa | Gourmand | Amber | Amber Floral | Vanilla, Salty, White Floral, Woody |
| 88 | By Kilian Angels' Share | Amber | Gourmand | Amber Vanilla | Woody, Warm Spicy, Sweet, Vanilla |
| 89 | Kilian Angels' Share | Gourmand | Amber | Amber | Amber |
| 91 | Givenchy Ange ou Demon | Gourmand | Amber | Amber Floral | Vanilla, Sweet, Warm Spicy, White Floral |
| 101 | Parfums de Marly Layton | Woody | Amber | Amber Floral | Warm Spicy, Vanilla, Fresh Spicy, Woody |
| 102 | Jean Paul Gaultier Classique | Gourmand | Floral | Amber Floral | White Floral, Sweet, Powdery, Citrus |
| 106 | Tom Ford Ombré Leather (2018) | Amber | Woody | Leather | Leather, Animalic, Warm Spicy, White Floral |
| 107 | Dior Sauvage Elixir ? | Amber | Fresh | Aromatic | Warm Spicy, Fresh Spicy, Woody, Aromatic |
| 110 | Guerlain Samsara ? | Amber | Floral | Amber Woody | Powdery, Woody, Yellow Floral, Vanilla |
| 112 | Montblanc Explorer | Amber | Woody | Woody Aromatic | Woody, Citrus, Aromatic, Amber |
| 115 | Serge Lutens Chergui | Gourmand | Amber | Amber Spicy | Amber, Sweet, Tobacco, Honey |
| 117 | Hugo Boss Boss Bottled | Amber | Woody | Woody Spicy | Woody, Fruity, Vanilla, Warm Spicy |
| 118 | Hugo Boss Bottled | Fresh | Woody | Woody Spicy | Woody, Fruity, Vanilla, Warm Spicy |
| 126 | Giorgio Armani Armani Code | Fresh | Amber | Amber Spicy | Citrus, Leather, Anis, Soft Spicy |
| 127 | Giorgio Armani Code | Fresh | Amber | Amber Spicy | Citrus, Leather, Anis, Soft Spicy |
| 128 | Yves Saint Laurent Cinema | Floral | Amber | Amber Floral | Floral, Vanilla, Amber, Sweet |
| 129 | Versace Versense | Fresh | Woody | Woody Floral Musk | Citrus, Woody, Fresh Spicy, Aromatic |
| 133 | Dior Dolce Vita | Floral | Amber | Amber Woody | Warm Spicy, Woody, Powdery, Vanilla |
| 134 | Prada Infusion d'Iris | Amber | Floral | Floral Woody Musk | Iris, Woody, Amber, Powdery |
| 138 | Lancôme Trésor Midnight Rose | Fresh | Floral | Floral Woody Musk | Fruity, Rose, Sweet, Soft Spicy |
| 143 | Chanel Allure Homme Sport Eau Extreme | Fresh | Woody | Woody Aromatic | Aromatic, Woody, Fresh Spicy, Citrus |
| 146 | Issey Miyake L'Eau d'Issey | Fresh | Floral | Floral Aquatic | Floral, Fresh, White Floral, Ozonic |
| 149 | Giorgio Armani Stronger With You Intensely | Gourmand | Amber | Amber Fougere | Vanilla, Sweet, Amber, Cinnamon |
| 150 | Mugler Aura Mugler ? | Gourmand | Fresh | Amber | Green, Woody, Vanilla, Sweet |
| 154 | Dior Midnight Poison | Amber | Woody | Woody Chypre | Patchouli, Citrus, Rose, Woody |
| 155 | Gucci Guilty | Floral | Amber | Amber Floral | Floral, Soft Spicy, Fruity, Sweet |
| 160 | Juliette Has A Gun Not A Perfume | Amber | Floral | Floral Woody Musk | Amber, Musky, Woody |
| 167 | Guerlain Shalimar Parfum Initial ? | Gourmand | Woody | Chypre Floral | Vanilla, Powdery, Citrus, Woody |
| 169 | Nasomatto Black Afgano | Amber | Woody | Woody Aromatic | Amber, Smoky, Oud, Woody |
| 170 | Moschino Toy Boy ? | Amber | Floral | Woody Spicy | Rose, Floral, Musky, Woody |
| 174 | Elie Saab Le Parfum | Gourmand | Floral | Amber Floral | White Floral, Honey, Sweet, Floral |
| 180 | Jimmy Choo Jimmy Choo | Gourmand | Woody | Chypre Fruity | Sweet, Patchouli, Fruity, Woody |
| 181 | Kilian Love Don't Be Shy ? | Gourmand | Floral | Floral Amber | Amber, Floral |
| 184 | Tom Ford Tuscan Leather | Amber | Woody | Leather | Leather, Fruity, Animalic, Sweet |
| 186 | Diptyque Philosykos Eau de Parfum | Fresh | Woody | Woody Aromatic | Green, Woody, Sweet, Fresh |
| 188 | Burberry Brit | Fresh | Gourmand | Floral Fruity | Sweet, Vanilla, Fruity, Almond |
| 194 | Escentric Molecules Molecule 01 | Fresh | Woody | Woody Floral Musk | Woody, Musky, Amber, Animalic |

### The ones I would look at twice

- **Yves Saint Laurent Libre, Floral to Fresh.** White floral leads, but citrus and lavender follow and outvote it. Many would call it a floral.
- **La Nuit de L'Homme and Sauvage Elixir, Amber to Fresh.** Aromatic and lavender accords carry them. Both read warmer and spicier than Fresh suggests.
- **Coco Mademoiselle, Floral to Woody.** Woody and patchouli outvote the florals. Defensible as a modern chypre; still a surprise.
- **Mugler Aura, Gourmand to Fresh.** Green leads its accords.
- **Samsara, Amber to Floral, and Shalimar Parfum Initial, Gourmand to Woody.** Powdery and floral accords in one, a "Chypre Floral" group in the other.
- **Kilian Love Don't Be Shy, Gourmand to Floral.** This duplicate row has only two accords (Amber, Floral); the fuller "By Kilian" row lands in Amber.

Where the same fragrance sits in the catalogue twice (Bleu de Chanel, Boss Bottled, Armani Code), the two rows now agree with each other. Before, they did not.

## If you want something different

- **Go:** I apply 0038 to production. Every changed row's old family is saved, so it can be put back in one step.
- **Go, with corrections:** name the fragrances that should sit elsewhere. I can pin those by hand, or adjust a weight if they share a cause.
- **Stop:** staging is rolled back and production stays as it is. The 32 new releases keep the families this rule gave them unless you say otherwise.
