// DEMO catalogue derived from the DryHarvest asset-folder guides.
// Prices are placeholders. No nutrition, health or certification data is invented —
// those fields are left empty for the business to fill in with verified information.

type P = {
  name: string; short: string; sizes: [string, number, number][]; // label, price ₹, mrp ₹
  collections?: string[]; tags?: string[]; featured?: boolean;
};
type C = {
  slug: string; name: string; tagline: string; description: string; kind: 'FOOD' | 'PET' | 'DECOR';
  safetyNote?: string; products: P[];
};

const s = (g: number, price: number, mrp: number): [string, number, number] => [g >= 1000 ? `${g / 1000}kg` : `${g}g`, price, mrp];

export const CATEGORIES: C[] = [
  {
    slug: 'dried-fruits', name: 'Dried Fruits', tagline: 'Natural fruit snacks', kind: 'FOOD',
    description: 'Slices, rings and chips of seasonal fruit, dried slowly to keep their colour and bite.',
    products: [
      { name: 'Dried Mango Slices', short: 'Chewy, tangy-sweet slices of ripe mango.', sizes: [s(100, 189, 220), s(250, 429, 499), s(500, 799, 950)], collections: ['best-sellers', 'natural-snacks'], featured: true, tags: ['mango', 'fruit', 'snack'] },
      { name: 'Banana Chips', short: 'Thin, crisp banana slices.', sizes: [s(100, 99, 120), s(250, 229, 260), s(500, 429, 499)], collections: ['best-sellers', 'natural-snacks'], tags: ['banana', 'chips'] },
      { name: 'Dried Pineapple Rings', short: 'Bright golden rings with a natural tang.', sizes: [s(100, 219, 250), s(250, 499, 560)], collections: ['best-sellers', 'natural-snacks'], featured: true, tags: ['pineapple'] },
      { name: 'Dried Papaya Cubes', short: 'Soft, sweet papaya cubes.', sizes: [s(100, 149, 170), s(250, 349, 399)], collections: ['natural-snacks'], tags: ['papaya'] },
      { name: 'Dried Jackfruit Chips', short: 'Crunchy jackfruit bulbs, a Kerala favourite.', sizes: [s(100, 199, 230), s(250, 469, 520)], collections: ['natural-snacks', 'south-indian'], tags: ['jackfruit', 'chakka'] },
      { name: 'Dried Guava Slices', short: 'Pink guava slices with a light crunch.', sizes: [s(100, 179, 199)], collections: ['natural-snacks'], tags: ['guava'] },
      { name: 'Dried Chikoo Slices', short: 'Caramel-sweet sapota slices.', sizes: [s(100, 189, 210)], collections: ['natural-snacks'], tags: ['chikoo', 'sapota'] },
      { name: 'Dried Dragon Fruit', short: 'Vivid slices of dragon fruit.', sizes: [s(50, 199, 229), s(100, 369, 420)], collections: ['natural-snacks'], tags: ['dragon fruit', 'pitaya'] },
      { name: 'Dried Apple Rings', short: 'Light, crisp apple rings.', sizes: [s(100, 229, 260), s(250, 529, 599)], collections: ['natural-snacks'], tags: ['apple'] },
      { name: 'Dried Amla Candy-free Pieces', short: 'Tart Indian gooseberry pieces, no sugar coating.', sizes: [s(100, 159, 180), s(250, 369, 420)], tags: ['amla', 'gooseberry'] },
    ],
  },
  {
    slug: 'dried-vegetables', name: 'Dried Vegetables', tagline: 'Dehydrated veggies', kind: 'FOOD',
    description: 'Pantry-ready vegetables for curries, soups and quick weeknight cooking.',
    products: [
      { name: 'Dried Okra Slices', short: 'Sliced bhindi, ready to rehydrate or fry.', sizes: [s(100, 149, 170), s(250, 339, 380)], collections: ['best-sellers', 'veg-herbs'], featured: true, tags: ['okra', 'bhindi', 'vendakkai'] },
      { name: 'Sun-Dried Tomatoes', short: 'Deep red tomato halves with concentrated flavour.', sizes: [s(100, 199, 230), s(250, 459, 520)], collections: ['best-sellers', 'veg-herbs'], featured: true, tags: ['tomato'] },
      { name: 'Dried Onion Flakes', short: 'Crisp onion flakes for tadka and gravies.', sizes: [s(100, 99, 120), s(250, 229, 260)], collections: ['veg-herbs'], tags: ['onion'] },
      { name: 'Dried Garlic Flakes', short: 'Golden garlic flakes.', sizes: [s(100, 149, 170), s(250, 349, 399)], collections: ['veg-herbs'], tags: ['garlic'] },
      { name: 'Dried Carrot Cubes', short: 'Diced carrot for soups and pulao.', sizes: [s(100, 129, 150)], collections: ['veg-herbs'], tags: ['carrot'] },
      { name: 'Dried Beetroot Chips', short: 'Ruby beetroot slices.', sizes: [s(100, 139, 160)], collections: ['veg-herbs'], tags: ['beetroot'] },
      { name: 'Dried Spinach Leaves', short: 'Whole dried palak leaves.', sizes: [s(50, 119, 140), s(100, 219, 250)], collections: ['veg-herbs'], tags: ['spinach', 'palak'] },
      { name: 'Dried Pumpkin Cubes', short: 'Sweet pumpkin cubes.', sizes: [s(100, 129, 150)], tags: ['pumpkin'] },
      { name: 'Dried Capsicum Strips', short: 'Mixed bell pepper strips.', sizes: [s(100, 179, 199)], tags: ['capsicum', 'bell pepper'] },
      { name: 'Dried Drumstick Pieces', short: 'Cut moringa pods for sambar.', sizes: [s(100, 149, 170)], collections: ['south-indian'], tags: ['drumstick', 'murungakkai'] },
    ],
  },
  {
    slug: 'mushrooms', name: 'Mushrooms', tagline: 'Dried & mushroom powders', kind: 'FOOD',
    description: 'Whole, sliced and powdered mushrooms with deep, savoury flavour.',
    products: [
      { name: 'Dried Shiitake Mushrooms', short: 'Whole shiitake caps.', sizes: [s(50, 249, 280), s(100, 469, 520)], collections: ['veg-herbs'], tags: ['shiitake'] },
      { name: 'Dried Oyster Mushrooms', short: 'Delicate oyster mushroom pieces.', sizes: [s(50, 199, 230), s(100, 379, 420)], tags: ['oyster'] },
      { name: 'Dried Button Mushroom Slices', short: 'Sliced button mushrooms.', sizes: [s(50, 169, 190), s(100, 319, 360)], collections: ['best-sellers'], tags: ['button'] },
      { name: 'Dried Milky Mushrooms', short: 'Firm milky mushroom slices.', sizes: [s(50, 189, 210)], tags: ['milky'] },
      { name: 'Mushroom Powder', short: 'Finely ground mushroom for soups and gravies.', sizes: [s(100, 299, 340)], tags: ['powder'] },
    ],
  },
  {
    slug: 'herbs-and-leaves', name: 'Herbs & Leaves', tagline: 'Leaf powders & herbs', kind: 'FOOD',
    description: 'Shade-dried leaves and fine leaf powders for cooking and infusions.',
    products: [
      { name: 'Moringa Leaf Powder', short: 'Fine green powder from dried moringa leaves.', sizes: [s(100, 179, 199), s(250, 399, 450)], collections: ['best-sellers', 'veg-herbs'], featured: true, tags: ['moringa', 'murungai keerai'] },
      { name: 'Dried Curry Leaves', short: 'Whole curry leaves for tempering.', sizes: [s(50, 79, 99), s(100, 149, 170)], collections: ['veg-herbs', 'south-indian'], tags: ['curry leaves', 'karuveppilai'] },
      { name: 'Dried Mint Leaves', short: 'Crushed pudina leaves.', sizes: [s(50, 99, 120)], collections: ['veg-herbs'], tags: ['mint', 'pudina'] },
      { name: 'Dried Tulsi Leaves', short: 'Holy basil leaves.', sizes: [s(50, 129, 150)], collections: ['tea'], tags: ['tulsi', 'basil'] },
      { name: 'Lemongrass Cut', short: 'Cut lemongrass for brewing.', sizes: [s(50, 119, 140)], collections: ['tea'], tags: ['lemongrass'] },
      { name: 'Dried Coriander Leaves', short: 'Kasuri-style coriander leaves.', sizes: [s(50, 99, 120)], collections: ['veg-herbs'], tags: ['coriander', 'kothamalli'] },
      { name: 'Kasuri Methi', short: 'Dried fenugreek leaves.', sizes: [s(50, 89, 110), s(100, 169, 190)], collections: ['veg-herbs'], tags: ['fenugreek', 'methi'] },
    ],
  },
  {
    slug: 'flowers-and-tea', name: 'Flowers & Tea', tagline: 'Herbal & floral teas', kind: 'FOOD',
    description: 'Whole dried flowers for caffeine-free infusions.',
    products: [
      { name: 'Hibiscus Flower Tea', short: 'Whole dried hibiscus petals, deep ruby brew.', sizes: [s(50, 149, 170), s(100, 279, 320)], collections: ['best-sellers', 'tea'], featured: true, tags: ['hibiscus'] },
      { name: 'Butterfly Pea Flowers', short: 'Blue flowers that brew a vivid blue tea.', sizes: [s(25, 149, 170), s(50, 269, 299)], collections: ['tea'], tags: ['butterfly pea', 'shankhpushpi', 'blue tea'] },
      { name: 'Rose Petals', short: 'Fragrant dried rose petals.', sizes: [s(50, 159, 180)], collections: ['tea'], tags: ['rose'] },
      { name: 'Chamomile Flowers', short: 'Whole chamomile heads.', sizes: [s(50, 249, 280)], collections: ['tea'], tags: ['chamomile'] },
      { name: 'Jasmine Flowers', short: 'Dried jasmine buds for tea blends.', sizes: [s(25, 189, 210)], collections: ['tea'], tags: ['jasmine'] },
      { name: 'Chrysanthemum Flowers', short: 'Golden chrysanthemum blooms.', sizes: [s(25, 179, 199)], collections: ['tea'], tags: ['chrysanthemum'] },
      { name: 'Calendula Petals', short: 'Bright orange calendula petals.', sizes: [s(25, 169, 190)], collections: ['tea'], tags: ['calendula'] },
    ],
  },
  {
    slug: 'spices-and-powders', name: 'Spices & Powders', tagline: 'Natural spice powders', kind: 'FOOD',
    description: 'Single-ingredient powders, ground from dried produce.',
    products: [
      { name: 'Ginger Powder', short: 'Warm, zesty dried ginger (sukku) powder.', sizes: [s(100, 129, 150), s(250, 299, 340)], tags: ['ginger', 'sukku', 'saunth'] },
      { name: 'Turmeric Powder', short: 'Earthy turmeric powder.', sizes: [s(100, 89, 105), s(250, 199, 230), s(500, 379, 430)], collections: ['best-sellers'], tags: ['turmeric', 'manjal'] },
      { name: 'Chilli Flakes', short: 'Crushed red chilli flakes.', sizes: [s(100, 119, 140)], tags: ['chilli'] },
      { name: 'Lemon Powder', short: 'Tangy powder from dried lemons.', sizes: [s(100, 149, 170)], tags: ['lemon'] },
      { name: 'Garlic Powder', short: 'Fine garlic powder.', sizes: [s(100, 149, 170)], tags: ['garlic'] },
      { name: 'Tomato Powder', short: 'Tomato powder for gravies and seasoning.', sizes: [s(100, 169, 190)], tags: ['tomato'] },
      { name: 'Kokum Powder', short: 'Souring powder from dried kokum.', sizes: [s(100, 179, 199)], tags: ['kokum'] },
      { name: 'Amchur Powder', short: 'Dry mango powder.', sizes: [s(100, 109, 125)], tags: ['amchur', 'mango'] },
    ],
  },
  {
    slug: 'traditional-south-indian', name: 'Traditional South Indian Foods', tagline: 'South Indian vathal', kind: 'FOOD',
    description: 'Sun-dried vathal and vadagam made the traditional way — fry or roast and serve with rice.',
    products: [
      { name: 'Sundakkai Vathal', short: 'Sun-dried turkey berries for vathal kuzhambu.', sizes: [s(100, 129, 150), s(250, 299, 340)], collections: ['best-sellers', 'south-indian'], featured: true, tags: ['sundakkai', 'turkey berry'] },
      { name: 'Manathakkali Vathal', short: 'Dried black nightshade berries.', sizes: [s(100, 159, 180)], collections: ['south-indian'], tags: ['manathakkali'] },
      { name: 'Mor Milagai', short: 'Buttermilk-cured, sun-dried green chillies.', sizes: [s(100, 119, 140), s(250, 279, 320)], collections: ['south-indian'], tags: ['mor milagai', 'curd chilli'] },
      { name: 'Dried Brinjal Vathal', short: 'Sun-dried brinjal slices.', sizes: [s(100, 119, 140)], collections: ['south-indian'], tags: ['brinjal', 'kathirikkai'] },
      { name: 'Banana Flower Vathal', short: 'Dried vazhaipoo.', sizes: [s(100, 149, 170)], collections: ['south-indian'], tags: ['banana flower', 'vazhaipoo'] },
      { name: 'Dried Neem Flowers', short: 'Veppam poo for rasam and pachadi.', sizes: [s(50, 99, 120)], collections: ['south-indian'], tags: ['neem flower', 'veppam poo'] },
    ],
  },
  {
    slug: 'seeds-and-snacks', name: 'Seeds & Snacks', tagline: 'Nutritious seeds & mixes', kind: 'FOOD',
    description: 'Seeds, makhana and roasted legumes for everyday snacking.',
    products: [
      { name: 'Pumpkin Seeds', short: 'Raw green pumpkin seeds.', sizes: [s(100, 169, 199), s(250, 399, 450)], collections: ['natural-snacks'], tags: ['pumpkin seeds'] },
      { name: 'Watermelon Seeds', short: 'Shelled watermelon seeds.', sizes: [s(100, 189, 210)], tags: ['watermelon seeds'] },
      { name: 'Sunflower Seeds', short: 'Shelled sunflower kernels.', sizes: [s(100, 99, 120), s(250, 229, 260)], tags: ['sunflower seeds'] },
      { name: 'Flax Seeds', short: 'Whole brown flax seeds.', sizes: [s(100, 69, 85), s(250, 159, 180)], tags: ['flax', 'alsi'] },
      { name: 'Chia Seeds', short: 'Black chia seeds.', sizes: [s(100, 129, 150), s(250, 299, 340)], tags: ['chia'] },
      { name: 'Sesame Seeds', short: 'White sesame seeds.', sizes: [s(100, 69, 85)], tags: ['sesame', 'ellu'] },
      { name: 'Makhana', short: 'Large fox nut puffs.', sizes: [s(100, 199, 230), s(250, 469, 520)], collections: ['natural-snacks', 'best-sellers'], tags: ['makhana', 'fox nut', 'lotus seed'] },
      { name: 'Roasted Chana', short: 'Roasted Bengal gram.', sizes: [s(250, 99, 120), s(500, 189, 220)], collections: ['natural-snacks'], tags: ['chana', 'pottukadalai'] },
    ],
  },
  {
    slug: 'ready-to-cook', name: 'Ready-to-Cook', tagline: 'Instant meal mixes', kind: 'FOOD',
    description: 'Dry mixes with vegetables and grains — just add water and cook.',
    products: [
      { name: 'Mixed Vegetable Soup Mix', short: 'Dried vegetable soup base.', sizes: [s(100, 129, 150), s(200, 239, 270)], collections: ['ready-to-cook'], tags: ['soup'] },
      { name: 'Ven Pongal Mix', short: 'Rice and moong dal pongal mix.', sizes: [s(200, 149, 170), s(500, 339, 380)], collections: ['ready-to-cook', 'south-indian'], featured: true, tags: ['pongal'] },
      { name: 'Vegetable Upma Mix', short: 'Rava upma mix with dried vegetables.', sizes: [s(200, 119, 140), s(500, 269, 299)], collections: ['ready-to-cook', 'south-indian'], tags: ['upma'] },
      { name: 'Millet Dosa Mix', short: 'Instant multi-millet dosa batter mix.', sizes: [s(250, 169, 190), s(500, 319, 360)], collections: ['ready-to-cook', 'south-indian'], tags: ['millet', 'dosa'] },
      { name: 'Moong Dal Khichdi Mix', short: 'Rice, moong dal and vegetable khichdi.', sizes: [s(200, 149, 170)], collections: ['ready-to-cook'], tags: ['khichdi'] },
      { name: 'Vegetable Rice Mix', short: 'Seasoned dried vegetables for quick pulao.', sizes: [s(100, 139, 160)], collections: ['ready-to-cook'], tags: ['rice mix', 'pulao'] },
    ],
  },
  {
    slug: 'pet-products', name: 'Pet Products', tagline: 'Natural pet treats', kind: 'PET',
    safetyNote: 'For animal use only. Not for human consumption. Introduce new treats gradually and consult your vet for pets with health conditions.',
    description: 'Simple dried treats for pets, packed and stored separately from our human-food range.',
    products: [
      { name: 'Dried Sweet Potato Chews (Dog Treat)', short: 'Single-ingredient chewy sweet potato strips for dogs.', sizes: [s(100, 199, 230), s(250, 449, 499)], tags: ['dog', 'treat'] },
      { name: 'Dried Pumpkin Bites (Pet Treat)', short: 'Dried pumpkin pieces for dogs and cats.', sizes: [s(100, 179, 199)], tags: ['dog', 'cat', 'treat'] },
      { name: 'Dried Carrot Sticks (Small Pet Treat)', short: 'Carrot sticks for rabbits and guinea pigs.', sizes: [s(100, 149, 170)], tags: ['rabbit', 'guinea pig'] },
    ],
  },
  {
    slug: 'decorative-products', name: 'Decorative Products', tagline: 'Dried flowers & décor', kind: 'DECOR',
    safetyNote: 'Decorative item — not edible. Keep away from children, pets and open flames.',
    description: 'Dried botanicals for home décor, crafts and gifting. Not for consumption.',
    products: [
      { name: 'Dried Eucalyptus Bunch', short: 'Preserved eucalyptus stems.', sizes: [['1 bunch', 449, 499]] },
      { name: 'Pampas Grass Stems', short: 'Fluffy natural pampas stems.', sizes: [['5 stems', 599, 699]] },
      { name: 'Botanical Potpourri', short: 'Dried petals and peels for bowls and sachets.', sizes: [s(100, 299, 340)] },
      { name: 'Decorative Dried Orange Slices', short: 'Translucent citrus wheels for garlands and wreaths.', sizes: [['20 pcs', 249, 280]], tags: ['orange', 'craft'] },
    ],
  },
];

export const COMBOS: P[] = [
  { name: 'Fruit Snack Sampler Box', short: 'Mango, pineapple, papaya and banana in one box.', sizes: [['4 × 100g', 599, 699]], collections: ['combo'], featured: true },
  { name: 'South Indian Vathal Combo', short: 'Sundakkai, manathakkali and mor milagai.', sizes: [['3 × 100g', 379, 420]], collections: ['combo', 'south-indian'] },
  { name: 'Herbal Tea Gift Box', short: 'Hibiscus, butterfly pea and chamomile.', sizes: [['3 × 50g', 649, 749]], collections: ['combo', 'tea'] },
];

export const HOME_SECTIONS = [
  { key: 'hero', title: "Nature's Goodness, Perfectly Preserved.", eyebrow: 'Naturally Good. Naturally Dried.', subtitle: 'Discover premium dried fruits, vegetables, herbs and natural ingredients. Carefully processed, beautifully packed and delivered to your doorstep.', data: { primaryCta: { label: 'Shop Now', href: '/shop' }, secondaryCta: { label: 'Explore Products', href: '/categories' }, imageUrl: '' } },
  { key: 'trust', title: 'Why shop with us', data: {} },
  { key: 'categories', title: 'Shop by Category', eyebrow: 'Explore our range', data: {} },
  { key: 'best-sellers', title: 'Best Sellers', eyebrow: 'Customer favourites', data: { collection: 'best-sellers' } },
  { key: 'south-indian', title: 'Traditional South Indian Collection', eyebrow: 'From our kitchens', subtitle: 'Vathal, vadagam and pantry staples, sun-dried the way they have always been.', data: { collection: 'south-indian' } },
  { key: 'natural-snacks', title: 'Dried Fruits & Natural Snacks', eyebrow: 'Snack better', data: { collection: 'natural-snacks' } },
  { key: 'veg-herbs', title: 'Vegetables, Herbs & Powders', eyebrow: 'For the pantry', data: { collection: 'veg-herbs' } },
  { key: 'tea', title: 'Flowers & Herbal Tea', eyebrow: 'Brew something calm', data: { collection: 'tea' } },
  { key: 'ready-to-cook', title: 'Ready-to-Cook', eyebrow: 'Dinner, sorted', data: { collection: 'ready-to-cook' } },
  { key: 'combo', title: 'Combo Packs & Gift Boxes', eyebrow: 'Made for gifting', data: { collection: 'combo' } },
  { key: 'why', title: 'Why DryHarvest', eyebrow: 'Our promise', data: { points: [
    { title: 'Carefully selected', text: 'We choose produce batch by batch and dry it slowly to keep colour and flavour.' },
    { title: 'Packed to keep fresh', text: 'Resealable pouches that protect against moisture and light.' },
    { title: 'Clear labelling', text: 'Batch, pack and best-before dates on every pack.' },
    { title: 'Here to help', text: 'Questions about an order or product? Our team answers quickly.' },
  ] } },
  { key: 'reviews', title: 'What customers say', eyebrow: 'Reviews', subtitle: 'Only reviews from verified buyers, published after moderation.', data: {} },
  { key: 'newsletter', title: 'Fresh harvests, first.', eyebrow: 'Newsletter', subtitle: 'New products, seasonal harvests and recipes. No spam — unsubscribe anytime.', data: {} },
];
